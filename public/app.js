const btn = document.getElementById("analyzeBtn");
const input = document.getElementById("reviewInput");
const results = document.getElementById("results");

btn.addEventListener("click", async () => {
  const reviewText = input.value.trim();

  if (!reviewText) {
    results.innerHTML = "<p>Please paste a review.</p>";
    return;
  }

  results.innerHTML = "<p>Analyzing...</p>";

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ reviewText })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    const { analysis, responses } = data;

    results.innerHTML = `
      <div style="background:#1e293b;padding:20px;border-radius:10px;">
        <h3>Analysis</h3>
        <p><strong>Situation:</strong> ${analysis.situation}</p>
        <p><strong>Pattern:</strong> ${analysis.pattern}</p>
        <p><strong>Risk Score:</strong> ${analysis.riskScore}</p>
        <p><strong>Recovery Score:</strong> ${analysis.recoveryScore}</p>
        <p><strong>Confidence:</strong> ${analysis.confidence.label} (${analysis.confidence.score})</p>
        <p><strong>Recommended Action:</strong> ${analysis.recommendedAction}</p>

        <hr />

        <h3>Responses</h3>
        <p><strong>Actual Response:</strong><br/>${responses.actualResponse}</p>
        <p><strong>Polished Shade:</strong><br/>${responses.polishedShade}</p>
        <p><strong>What You Really Wanted to Say 😈:</strong><br/>${responses.vent}</p>
      </div>
    `;
  } catch (err) {
    results.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
});
