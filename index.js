const axios = require('axios');
const color = require('colors');
const {readFileSync} = require('fs');
const yaml_config = require('node-yaml-config');

var config = yaml_config.load('config.yml');
var user_id = ''

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function syncReadFile(filename) {
  const content = readFileSync(filename, 'utf-8');
  return content
}

const headers = {
  headers: {
    'Authorization': config.token,
    'Content-Type': 'application/json'
  }
}

async function getChannelInfo(channel_id){
  const channel = await axios.get(`https://discord.com/api/v9/channels/${channel_id}`, headers)
  const guild = await axios.get(`https://discord.com/api/v9/guilds/${channel.data.guild_id}`, headers)

  channel_name = channel.data && channel.data.name ? channel.data.name : channel_id 
  guild_name = guild.data && guild.data.name ? guild.data.name : "Unknown guild"

  return {channel_name, guild_name}
}

async function checkDoublePosting(channel_id, number){
  const response = await axios.get(`https://discord.com/api/v9/channels/${channel_id}/messages?limit=${number}`, headers)
  for(let i = 0; i < number; i++){
    if(response.data[i].author.id == user_id){
      return false
    }
  }
  return true
}

async function sendToChannel(channel_id, message, channel_name, guild_name){
  // Check if you double-post / spam
  if(config.avoid_spam.enabled){
    var can_post = await checkDoublePosting(channel_id, config.avoid_spam.messages)
    if (!can_post){
      return config.debug_mode ? console.log(` > Skipping "${channel_name}" in "${guild_name}" because you have "avoid_spam" enabled`) : null
    }
  }
  // Post the message to the API
  await axios.post(`https://discord.com/api/v9/channels/${channel_id}/messages`, {
    content: message
    }, 
    headers
  )
  config.debug_mode ? console.log(` > A message was sent to "${channel_name}" in "${guild_name}"`) : null
}

console.clear()

// Don't skid plz thx

process.title = "Made by XtramCZ"
console.log(color.red(`
     █████╗ ██╗   ██╗████████╗ ██████╗      █████╗ ██████╗ 
    ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗    ██╔══██╗██╔══██╗
    ███████║██║   ██║   ██║   ██║   ██║    ███████║██║  ██║
    ██╔══██║██║   ██║   ██║   ██║   ██║    ██╔══██║██║  ██║
    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝    ██║  ██║██████╔╝
    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝     ╚═╝  ╚═╝╚═════╝ 

    `), 'by XtramCZ'
)

const message = syncReadFile('./message.txt')
async function sendMessage() {
  for (let i = 0; i < config.channels.length; i++) {
    // Get the channel info used in logs
    const { channel_name, guild_name } = await getChannelInfo(config.channels[i])
    try {
      sendToChannel(config.channels[i], message, channel_name, guild_name).then(() => {
      })
    } catch (err) {
      var code = err.response.data.code
      if(code == 50013){ // If the error is "Missing Permissions"
        console.log(color.red(` > There was a problem sending a message to "${channel_name}" in "${guild_name}" (MUTED)`))
      } else if(code == 20016){ // If the error is because of cooldown
        continue
      } else {
      console.log(color.red(`> There was a problem sending a message to "${channel_name}" in "${guild_name}"`));
      }
      continue
    }
  }

  // Wait the specified time and repeat the function
  var delay = config.interval

  if(config.randomize_interval.enabled){
    if(!(config.randomize_interval.minimum_interval > config.randomize_interval.maximum_interval)){
      delay = Math.floor(Math.random() * (config.randomize_interval.maximum_interval - config.randomize_interval.minimum_interval)) + config.randomize_interval.minimum_interval;
      config.debug_mode ? console.log(color.blue(` > Waiting ${delay} minutes...`)) : null
    }
  }
  setTimeout(sendMessage, delay * 60000) // Change 60000 to 1000 for testing (makes the interval seconds instead of minutes)
}


async function start(){
  try {
    var user = await axios.get('https://discord.com/api/v9/users/@me', headers)
    console.log()
    console.log(color.green(' > Token is valid!'))
    user_id = user.data.id
    console.log() 
    // Wait before starting
    config.wait_before_start > 0 ? console.log(` > Waiting ${config.wait_before_start} minutes before starting...`) : null
    await sleep(config.wait_before_start * 60000) // Change 60000 to 1000 for testing (makes the interval seconds instead of minutes)
    // Start the loop
    console.log()
    console.log(color.blue(' > Sending first batch of messages...'))
    console.log()
    sendMessage()
  } catch (error) {
    console.log()
    console.error(color.red(' > Token is invalid!'));
    process.exit(1)
  }
}

start()
