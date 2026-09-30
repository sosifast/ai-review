## CHAT AI API
const axios = require('axios');
let data = JSON.stringify({
  "max_tokens": 1024,
  "messages": [
    {
      "content": "hi ",
      "role": "user"
    }
  ],
  "web_access": false
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://chatgpt-42.p.rapidapi.com/gpt5',
  headers: { 
    'x-rapidapi-host': 'chatgpt-42.p.rapidapi.com', 
    'x-rapidapi-key': '8a4050d6c0msh88ab499efb777a0p1f20edjsne9b08be76c66', 
    'Content-Type': 'application/json'
  },
  data : data
};

axios.request(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});


const axios = require('axios');
let data = JSON.stringify({
  "messages": [
    {
      "content": "hai, aku sadi",
      "role": "user"
    }
  ],
  "web_access": false
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://chatgpt-42.p.rapidapi.com/conversationllama3',
  headers: { 
    'x-rapidapi-host': 'chatgpt-42.p.rapidapi.com', 
    'x-rapidapi-key': '8a4050d6c0msh88ab499efb777a0p1f20edjsne9b08be76c66', 
    'Content-Type': 'application/json'
  },
  data : data
};

axios.request(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});

Response:
{
    "result": "Hai, Sadi! Ada yang bisa saya bantu?",
    "status": true
}


## VISION AI
