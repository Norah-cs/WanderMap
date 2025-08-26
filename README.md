WanderMap 🗺️
````````````` 
A travel-inspired web app that lets users log memories, generate AI-enhanced visuals and captions, and explore their journey across the globe.


🌟 Features
`````````
🌍 Interactive World Map — Highlight countries you've visited and attach personal memories

🧠 AI Memory Generator — Leave the memory field blank to let the app dream one up for you

📤 Upload or Generate Photos — Choose your own or let the app create one based on your story

🎨 Emotion-Tuned Image Generation — Sentiment analysis tailors AI-generated images to match the tone of each memory

🖼️ Memory Gallery View — Browse all your memories in a scrollable, atmospheric gallery

🧩 Tooltip Previews — Hover over countries to preview notes and images instantly


🛠️ Tech Stack
```````````
Backend: Node.js, Express, PostgreSQL

Frontend: EJS, Vanilla JS, SVG map interactivity

AI Integration: Hugging Face Inference API (Stable Diffusion), Sentiment analysis via sentiment npm package

File Handling: Multer for uploads, base64 encoding for AI images

Design: Custom CSS with tone-based styling and modal interactions


🚀 Getting Started
````````````````````
bash
npm install
npm start

** Make sure to create a .env file with your Hugging Face token and database credentials **


💡 Future Enhancements
````````````````````````
Export memory cards as shareable images

Add QR codes for individual memories

Filter gallery by tone or continent

Add user authentication and multi-user support


📸 Highlights
```````````
![Highlights](images/coverpage.png)
![AI customization](images/feature_pic.png)
