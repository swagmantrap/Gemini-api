import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import './style.css';

// Replace with your actual API key
const API_KEY = 'AIzaSyBB9ooKfWtyS6NRaOrCg-6x_qFxxbFCL1I';

const form = document.querySelector('form');
const promptInput = document.querySelector('input[name="prompt"]');
const chatContainer = document.querySelector('.chat-container');
const fileInput = document.querySelector('input[type="file"]');
const imagePreviewContainer = document.querySelector('#image-preview');
const imagePreview = imagePreviewContainer.querySelector('img');
const closeImageButton = document.querySelector('#close-image');

let currentImage = null;

// Image preview functionality
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreviewContainer.style.display = 'block';
      currentImage = e.target.result.split(',')[1];
    };
    reader.readAsDataURL(file);
  }
});

// Close image preview functionality
closeImageButton.addEventListener('click', () => {
  imagePreviewContainer.style.display = 'none';
  imagePreview.src = '';
  currentImage = null;
  fileInput.value = ''; // Reset file input
});

function addMessageToChat(sender, content) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', `${sender}-message`);
  
  const md = new MarkdownIt();
  messageElement.innerHTML = `<div class="message-content">${md.render(content)}</div>`;
  
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

form.onsubmit = async (ev) => {
  ev.preventDefault();
  
  const userMessage = promptInput.value.trim();
  if (!userMessage) return;
  
  addMessageToChat('user', userMessage);
  promptInput.value = '';

  try {
    if (!currentImage) {
      throw new Error('Please upload an image');
    }

    const contents = [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: currentImage } },
          { text: userMessage }
        ]
      }
    ];

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    addMessageToChat('ai', 'Generating response...');
    const aiMessageElement = chatContainer.lastElementChild;

    const result = await model.generateContentStream({ contents });

    let buffer = [];
    for await (const response of result.stream) {
      buffer.push(response.text());
      aiMessageElement.querySelector('.message-content').innerHTML = new MarkdownIt().render(buffer.join(''));
    }
  } catch (e) {
    console.error('Error:', e);
    addMessageToChat('ai', `Error: ${e.message}`);
  }
};

const welcomeMessage = "Hello! Please upload an image of your artwork and ask for suggestions or a rating. I'm here to help you improve your art!";
const welcomeMessageElement = document.getElementById('welcome-message');

function typeWelcomeMessage(message, element, speed = 50) {
  let i = 0;
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  element.appendChild(cursor);

  function type() {
    if (i < message.length) {
      element.insertBefore(document.createTextNode(message.charAt(i)), cursor);
      i++;
      setTimeout(type, speed);
    } else {
      cursor.remove(); // Remove the cursor when typing is done
    }
  }
  type();
}

document.addEventListener('DOMContentLoaded', () => {
  typeWelcomeMessage(welcomeMessage, welcomeMessageElement);
});
