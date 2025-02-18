const questions = [
    { id: 1, text: "What is your age?", options: ["A. 18-30", "B. 31-50", "C. 51-64", "D. 65 or above"] },
    { id: 2, text: "What is your income source?", options: ["A. Fixed", "B. Variable", "C. None"] },
    { id: 3, text: "Annual investment amount?", options: ["A. Below $10,000", "B. $10,000 - $50,000", "C. $50,000 - $200,000", "D. Above $200,000"] },
    { id: 4, text: "Your next major expenditure?", options: ["A. Buying a house", "B. Paying for a college education", "C. Capitalizing a new business", "D. Providing for retirement"] },
    { id: 5, text: "Your primary objective for investing?", options: ["A. Ensure asset security with fixed returns", "B. Moderate appreciation with balanced risk", "C. Long-term growth, tolerant of short-term fluctuations", "D. Focus on high long-term returns, ignoring short-term volatility"] },
    { id: 6, text: "When do you expect to use your investment money?", options: ["A. Any time now (high liquidity needed)", "B. In 2-5 years", "C. In 6-10 years", "D. Beyond 11-20 years"] },
    { id: 7, text: "Expected annual income change?", options: ["A. Stay the same", "B. Moderate growth", "C. Substantial growth", "D. Moderate decrease", "E. Substantial decrease"] },
    { id: 8, text: "Your level of financial knowledge?", options: ["A. Lack basic investment knowledge", "B. Some understanding but no investment skills", "C. Fair understanding with some investment techniques", "D. Thorough understanding with advanced techniques"] },
    { id: 9, text: "Years of experience investing in risk assets?", options: ["A. None", "B. Under 2 years", "C. 2-5 years", "D. 5-8 years", "E. Over 8 years"] },
    { id: 10, text: "How do you perceive investment losses?", options: ["A. Very difficult to accept", "B. Some impact but manageable", "C. Neutral mindset, little emotional effect", "D. Completely normal, accepts risks"] },
    { id: 11, text: "Response after a 14% investment loss due to market correction?", options: ["A. Sell to avoid further decline", "B. Hold and wait for recovery", "C. Buy more at a lower price"] },
    { id: 12, text: "Maximum acceptable loss percentage?", options: ["A. Within 10%", "B. 10% - 30%", "C. 30% - 50%", "D. Over 50%"] },
    { id: 13, text: "Expected investment return rate?", options: ["A. Higher than fixed deposit rate", "B. ~10%, low risk", "C. 10-20%, moderate risk", "D. Over 20%, high risk"] },
    { id: 14, text: "Investing plan for your portfolio?", options: ["A. Diversify across all risk levels", "B. Moderate risk, high returns", "C. High-risk, highest returns"] },
    { id: 15, text: "Preferred stock investment type?", options: ["A. High-growth potential, low price", "B. Established growth companies", "C. Blue-chip dividend stocks"] },
    { id: 16, text: "Preferred bond investment type?", options: ["A. High-yield (junk) bond", "B. Established company bond", "C. Tax-free bond"] },
    { id: 17, text: "Response to inflation advice with long-term bonds?", options: ["A. Ignore advice", "B. Partial shift to hard assets", "C. Full shift to hard assets", "D. Over-invest in hard assets"] },
    { id: 18, text: "Game show decision with $10,000 winnings?", options: ["A. Take the money", "B. 50% chance at $50k", "C. 20% chance at $75k", "D. 5% chance at $100k"] }
  ];
const scoreMap = { A: 4, B: 3, C: 2, D: 1, E: 0 };

let currentQuestion = 0;
let answers = {};

const questionContainer = document.getElementById("questionContainer");
const progressBar = document.getElementById("progressBar");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");

function renderQuestion() {
    const q = questions[currentQuestion];
    questionContainer.innerHTML = `
      <div class="question-title">${q.text}</div>
      <div class="options">
        ${q.options.map(opt => `<label><input type="radio" name="q${q.id}" value="${opt[0]}"> ${opt}</label>`).join("")}
      </div>
    `;

    updateProgress();
    updateSidebar();

    prevBtn.style.display = currentQuestion > 0 ? "inline-block" : "none";
    nextBtn.style.display = currentQuestion < questions.length - 1 ? "inline-block" : "none";
    submitBtn.style.display = currentQuestion === questions.length - 1 ? "inline-block" : "none";

    // 预选中已选答案
    if (answers[q.id]) {
        document.querySelector(`input[name=q${q.id}][value="${answers[q.id]}"]`).checked = true;
    }
}

function updateProgress() {
    progressBar.style.width = ((currentQuestion + 1) / questions.length) * 100 + "%";
}

function updateSidebar() {
    const navList = document.getElementById("navList");
    navList.innerHTML = questions
        .map((q, index) => {
            const completed = answers[q.id] ? "completed" : "";
            return `<li class="${completed}"><a href="#" onclick="jumpToQuestion(${index})">Q${q.id}</a></li>`;
        })
        .join("");
}

function jumpToQuestion(index) {
    currentQuestion = index;
    renderQuestion();
}

prevBtn.addEventListener("click", () => {
    if (currentQuestion > 0) currentQuestion--;
    renderQuestion();
});

nextBtn.addEventListener("click", () => {
    const selectedOption = document.querySelector(`input[name=q${questions[currentQuestion].id}]:checked`);
    if (!selectedOption) {
        alert("Please select an answer before proceeding.");
        return;
    }
    answers[questions[currentQuestion].id] = selectedOption.value;
    if (currentQuestion < questions.length - 1) currentQuestion++;
    renderQuestion();
});

submitBtn.addEventListener("click", () => {
    const selectedOption = document.querySelector(`input[name=q${questions[currentQuestion].id}]:checked`);
    if (!selectedOption) {
        alert("Please select an answer before submitting.");
        return;
    }
    answers[questions[currentQuestion].id] = selectedOption.value;

    if (Object.keys(answers).length < questions.length) {
        alert("You must complete all questions before submitting.");
        return;
    }

    let score = Object.values(answers).reduce((acc, ans) => acc + scoreMap[ans], 0);
    localStorage.setItem("resultScore", score);
    localStorage.setItem("answers", JSON.stringify(answers));
    window.location.href = "result.html";
});

renderQuestion();
