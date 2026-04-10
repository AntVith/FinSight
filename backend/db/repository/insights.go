package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/AntVith/FinSight/backend/db"
)

type Insight struct {
	ID              int
	UserID          int
	Summary         string
	TopCategories   []CategorySummary
	Anomalies       []Anomaly
	Recommendations []string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type CategorySummary struct {
	Category    string  `json:"category"`
	TotalAmount float64 `json:"total_amount"`
	Count       int     `json:"count"`
}

type Anomaly struct {
	TransactionID string  `json:"transaction_id"`
	Name          string  `json:"name"`
	Amount        float64 `json:"amount"`
	Reason        string  `json:"reason"`
}

func UpsertInsight(ctx context.Context, insight Insight) error {
	topCategories, err := json.Marshal(insight.TopCategories)
	if err != nil {
		return fmt.Errorf("error marshaling top categories: %w", err)
	}

	anomalies, err := json.Marshal(insight.Anomalies)
	if err != nil {
		return fmt.Errorf("error marshaling anomalies: %w", err)
	}

	recommendations, err := json.Marshal(insight.Recommendations)
	if err != nil {
		return fmt.Errorf("error marshaling recommendations: %w", err)
	}

	_, err = db.DB.ExecContext(ctx, `
		INSERT INTO finsight.insights (user_id, summary, top_categories, anomalies, recommendations)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET
			summary         = EXCLUDED.summary,
			top_categories  = EXCLUDED.top_categories,
			anomalies       = EXCLUDED.anomalies,
			recommendations = EXCLUDED.recommendations,
			updated_at      = NOW()
	`, insight.UserID, insight.Summary, topCategories, anomalies, recommendations)

	if err != nil {
		return fmt.Errorf("error upserting insight: %w", err)
	}

	return nil
}

func GetInsightByUserID(ctx context.Context, userID int) (*Insight, error) {
	var insight Insight
	var topCategoriesJSON, anomaliesJSON, recommendationsJSON []byte

	err := db.DB.QueryRowContext(ctx, `
		SELECT id, user_id, summary, top_categories, anomalies, recommendations, created_at, updated_at
		FROM finsight.insights
		WHERE user_id = $1
	`, userID).Scan(
		&insight.ID,
		&insight.UserID,
		&insight.Summary,
		&topCategoriesJSON,
		&anomaliesJSON,
		&recommendationsJSON,
		&insight.CreatedAt,
		&insight.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying insight: %w", err)
	}

	if err := json.Unmarshal(topCategoriesJSON, &insight.TopCategories); err != nil {
		return nil, fmt.Errorf("error unmarshaling top categories: %w", err)
	}

	if err := json.Unmarshal(anomaliesJSON, &insight.Anomalies); err != nil {
		return nil, fmt.Errorf("error unmarshaling anomalies: %w", err)
	}

	if err := json.Unmarshal(recommendationsJSON, &insight.Recommendations); err != nil {
		return nil, fmt.Errorf("error unmarshaling recommendations: %w", err)
	}

	return &insight, nil
}