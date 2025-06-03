import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ReviewSuccessPage.css";

function ReviewSuccessPage() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  const handleSubmitAnother = () => {
    navigate("/submit-review");
  };

  return (
    <div className="success-page-container">
      <div className="success-content">
        <div className="success-icon">
          <div className="checkmark">✓</div>
        </div>

        <h1 className="success-title">Review Submitted Successfully!</h1>

        <p className="success-message">
          Thank you for sharing your food experience! Your review helps others
          discover great food in their city.
        </p>

        <div className="success-actions">
          <button onClick={handleGoHome} className="success-button primary">
            Go to Home
          </button>

          <button
            onClick={handleSubmitAnother}
            className="success-button secondary"
          >
            Submit Another Review
          </button>
        </div>

        <div className="success-stats">
          <p>🎉 You're helping build the best food community!</p>
        </div>

        {/* Celebration Particles */}
        <div className="celebration-particles">
          {[...Array(16)].map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`}></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReviewSuccessPage;
