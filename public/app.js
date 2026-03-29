document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const review = document.getElementById("reviewInput").value;

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ reviewText: review })
  });

  const data = await res.json();

  const resultDiv = document.getElementById("results");

  resultDiv.innerHTML = `
    <h2>Analysis</h2>
    <p><strong>Situation:</strong> ${data.analysis.situation}</p>
    <p><strong>Pattern:</strong> ${data.analysis.pattern}</p>
    <p><strong>Risk Score:</strong> ${data.analysis.riskScore}</p>
    <p><strong>Recovery Score:</strong> ${data.analysis.recoveryScore}</p>
    <p><strong>Confidence:</strong> ${data.analysis.confidence.label} (${data.analysis.confidence.score})</p>
    <p><strong>Recommended Action:</strong> ${data.analysis.recommendedAction}</p>

    <h3>Actual Response</h3>
    <p>${data.responses.actualResponse}</p>

    <h3>Polished Shade</h3>
    <p>${data.responses.polishedShade}</p>

    <h3>What I Really Wanted to Say 😈</h3>
    <p>${data.responses.vent}</p>
  `;
});
