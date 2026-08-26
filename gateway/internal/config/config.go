package config

import "os"

type Config struct {
	Addr         string
	AIServiceURL string
}

func Load() (*Config, error) {
	addr := os.Getenv("PORT")
	if addr == "" {
		addr = ":8080"
	}
	if addr[0] != ':' {
		addr = ":" + addr
	}

	aiServiceURL := os.Getenv("AI_SERVICE_URL")
	if aiServiceURL == "" {
		aiServiceURL = "http://ai-service:8000"
	}

	return &Config{Addr: addr, AIServiceURL: aiServiceURL}, nil
}
