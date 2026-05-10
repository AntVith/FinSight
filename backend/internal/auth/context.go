package auth

import "context"

type contextKey int

const authenticatedUserKey contextKey = iota + 1

func WithAuthenticatedUser(ctx context.Context, userID int) context.Context {
	return context.WithValue(ctx, authenticatedUserKey, userID)
}

func AuthenticatedUserID(ctx context.Context) (int, bool) {
	value, exists := ctx.Value(authenticatedUserKey).(int)
	return value, exists
}
