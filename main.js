const API_KEY = ""; //? Replace with your actual Gemini API key


async function fetchData() {
  document.getElementById("main").style.display = "none";
  document.getElementById("loader").style.display = "flex";

  //? fetching all stored data
  const storedData = JSON.parse(localStorage.getItem("apiData") || "{}");
  let storedWord = JSON.parse(localStorage.getItem("wordData")) || [
    { word: "No Word", means: "Start learning a new word today!" },
  ];
  let userStreak = JSON.parse(localStorage.getItem("streakData")) || {
    streak: 0,
    lastLogin: null,
  };
  const storedMonth = localStorage.getItem("lastUpdatedMonth"); 

  
  //? calculating current month
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().getMonth() + 1; 



 

  //? Check if the month has changed to reset the stored words
  if (storedMonth !== currentMonth.toString()) {
    console.log("Month changed! Clearing stored words...");
    storedWord = []; // Reset stored words list
    localStorage.setItem("wordData", JSON.stringify(storedWord)); // Update localStorage
    localStorage.setItem("lastUpdatedMonth", currentMonth.toString()); // Update stored month
  }

  //? if data is stored we will use it and not call the api
  if (storedData.date === today) {
    console.log("Using stored data:", storedData.data);
    updateUI(storedData.data, userStreak.streak, storedWord);
    return storedData.data;
  }

  //? Update streak if the user logs in on a new day
  if (userStreak.lastLogin !== today) {
    const lastDate = new Date(userStreak.lastLogin);
    const currentDate = new Date(today);
    const diffDays = (currentDate - lastDate) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      userStreak.streak += 1; 
    } else {
      userStreak.streak = 1; 
    }

    userStreak.lastLogin = today;
    localStorage.setItem("streakData", JSON.stringify(userStreak));
  }

  //? Fetch new data from Gemini API and updating stored data, word and UI
  const geminiData = await getGeminiResponse();

  if (geminiData) {
    localStorage.setItem(
      "apiData",
      JSON.stringify({ data: geminiData, date: today })
    );
    storedWord.unshift({
      word: geminiData.word,
      means: geminiData.short_meaning,
    });

    localStorage.setItem("wordData", JSON.stringify(storedWord));

    updateUI(geminiData, userStreak.streak, storedWord);
    return geminiData;
  }

  return null;
}

//? Function to get a random word from an external API
async function getRandomWord() {
  const urls = [
    "https://random-word-api.vercel.app/api",
    "https://random-word-api.herokuapp.com/word",
  ];

  const url = urls[Math.floor(Math.random() * urls.length)]; // Pick a random API
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch random word.");

    const data = await response.json();
    return data[0]; 
  } catch (error) {
    console.error("Error fetching random word:", error);
    return null;
  }
}

// Function to fetch data from Gemini API using the provided word
async function getGeminiResponse() {
  //? Fetching a random word
  const randomWord = await getRandomWord();
  if (!randomWord) return null; 
  console.log("Random word:", randomWord);
 

  //? Prompt to generate a daily vocabulary entry
  const userInput = `Generate a daily vocabulary entry for the word "${randomWord}" with the following criteria:
    - Word: ${randomWord}
    - Structure: Return ONLY valid JSON with fields: 'word', 'category', 'meaning','short_meaning' ,'example_usage' (an array of 5 short sentences).
    - Example Usage: Include 5 creative, relatable, or humorous sentences showcasing the word in context.
    - Focus on modern, conversational, or internet-inspired language that people can easily adopt in texts, chats, or casual talks.
    - DO NOT include markdown, code blocks, or explanations. Output only pure JSON.`;
 
  //? Fetch data from Gemini API
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userInput }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! Status: ${response.status} - ${errorData.error.message}`
      );
    }

    const data = await response.json();
    let geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    //? remove markdown from the response of gemni using regex
    const jsonMatch = geminiText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      geminiText = jsonMatch[1]; // Extract valid JSON
    }
    return JSON.parse(geminiText);
  } catch (error) {
    console.error("Gemini API request failed:", error);
    return null;
  }
}

// Function to update the UI dynamically
function updateUI(data, streakCount, storedWord) {
  //? today date
  const today = new Date().toISOString().split("T")[0];
  //? next date
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);
  const formattedNextDate = nextDay.toISOString().split("T")[0];

  //? buttons urls
  const googleSearchURL = `https://www.google.com/search?q=${encodeURIComponent(
    data.word
  )}`;
  const dictionaryURL = `https://www.dictionary.com/browse/${encodeURIComponent(
    data.word
  )}`;


  //? DOM manipulation
  document.getElementById("tdate").innerText = `${today.split("-")[2]}/${
    today.split("-")[1]
  }/${today.split("-")[0]}`;
  document.getElementById("ndate").innerText = `${
    formattedNextDate.split("-")[2]
  }/${formattedNextDate.split("-")[1]}/${formattedNextDate.split("-")[0]}`;
  document.getElementById("streak").innerText = `${streakCount} 🔥`;
  document.getElementById("word").innerText = `${data.word}`;
  document.getElementById("mean").innerText = `~ ${data.meaning}`;
  document.getElementById("google").href = googleSearchURL;
  document.getElementById("dict").href = dictionaryURL;
  document.getElementById("count").innerText = `${storedWord.length}`;

  const usebox = document.getElementById("usebox");
  usebox.innerHTML = ""; //? Clear previous examples
 
  //? Add new examples
  data.example_usage.forEach((example) => {
    const div = document.createElement("div");
    div.className = "use";
    div.innerText = example;
    usebox.appendChild(div);
  });
  const learnBox = document.getElementById("learnBox");
  learnBox.innerHTML = "";

  //? Adding all learned words 
  storedWord.forEach((entry) => {
    const div = document.createElement("div");
    const wordElement = document.createElement("p");
    const meanElement = document.createElement("p");
    wordElement.className = "light";
    wordElement.innerText = entry.word;
    meanElement.className = "dark";
    meanElement.innerText = `~ ${entry.means}`;
    div.className = "use";
    div.appendChild(wordElement);
    div.appendChild(meanElement);
    learnBox.appendChild(div);
  });
  document.getElementById("loader").style.display = "none";
  document.getElementById("main").style.display = "block";
}

//* Run the fetch function
fetchData();
