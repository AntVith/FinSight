package insights

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/AntVith/FinSight/backend/db/repository"
)

type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	Messages  []claudeMessage `json:"messages"`
}

type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

type insightOutput struct {
	Summary         string                    	 `json:"summary"`
	TopCategories   []repository.CategorySummary `json:"top_categories"`
	Anomalies       []repository.Anomaly         `json:"anomalies"`
	Recommendations []string                  	 `json:"recommendations"`
}

func GenerateInsight(ctx context.Context, userID int, transactions []repository.Transaction) error {
	if len(transactions) == 0 {
		return nil
	}

	prompt := buildPrompt(transactions)

	output, err := callClaude(ctx, prompt)
	if err != nil {
		return fmt.Errorf("error calling Claude: %w", err)
	}

	insight := repository.Insight{
		UserID:          userID,
		Summary:         output.Summary,
		TopCategories:   output.TopCategories,
		Anomalies:       output.Anomalies,
		Recommendations: output.Recommendations,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := repository.UpsertInsight(ctx, insight); err != nil {
		return fmt.Errorf("error saving insight: %w", err)
	}

	return nil
}

func buildPrompt(transactions []repository.Transaction) string {
	var sb strings.Builder

	sb.WriteString("You are a personal finance advisor. Analyze the following transactions and return a JSON object with exactly this structure:\n\n")
	sb.WriteString(`{
		"summary": "2-3 sentence plain English overview of the user's financial health",
		"top_categories": [
			{"category": "category name", "total_amount": 0.00, "count": 0}
		],
		"anomalies": [
			{"transaction_id": "id", "name": "merchant", "amount": 0.00, "reason": "why this is unusual"}
		],
		"recommendations": [
			"recommendation 1",
			"recommendation 2",
			"recommendation 3"
		]
	}`)
	sb.WriteString("\n\nReturn ONLY the JSON object, no other text, no markdown, no backticks.\n\n")
	sb.WriteString("Transactions:\n")

	for _, t := range transactions {
		sb.WriteString(fmt.Sprintf("- %s | %s | $%.2f | %s | pending: %v\n",
			t.Date.Format("2006-01-02"),
			t.Name,
			t.Amount,
			t.CategoryPrimary,
			t.Pending,
		))
	}

	return sb.String()
}

func callClaude(ctx context.Context, prompt string) (*insightOutput, error) {
	apiKey := os.Getenv("CLAUDE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("CLAUDE_API_KEY is not set")
	}

	model := os.Getenv("CLAUDE_MODEL")
	if model == "" {
		model = "claude-sonnet-4-20250514"
	}

	reqBody := claudeRequest{
		Model:     model,
		MaxTokens: 1000,
		Messages: []claudeMessage{
			{Role: "user", Content: prompt},
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error calling Claude API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Claude API returned status %d", resp.StatusCode)
	}

	var claudeResp claudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		return nil, fmt.Errorf("error decoding Claude response: %w", err)
	}

	if len(claudeResp.Content) == 0 {
		return nil, fmt.Errorf("empty response from Claude")
	}

	var output insightOutput
	if err := json.Unmarshal([]byte(claudeResp.Content[0].Text), &output); err != nil {
		return nil, fmt.Errorf("error parsing Claude output as JSON: %w", err)
	}

	return &output, nil
}
