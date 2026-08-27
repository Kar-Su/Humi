package server

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"humi/gateway/internal/config"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(_ *http.Request) bool { return true },
}

type Server struct {
	cfg  *config.Config
	http *http.Server
}

func New(cfg *config.Config) *Server {
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()
	r.Use(gin.Recovery(), cors())
	r.GET("/health", health)
	r.GET("/ws", func(c *gin.Context) { proxyWS(c, cfg) })

	return &Server{
		cfg: cfg,
		http: &http.Server{
			Addr:    cfg.Addr,
			Handler: r,
		},
	}
}

func (s *Server) Run() error {
	log.Printf("gateway mendengarkan di %s (ai-service: %s)", s.cfg.Addr, s.cfg.AIServiceURL)
	return s.http.ListenAndServe()
}

func (s *Server) Shutdown(timeout time.Duration) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	if err := s.http.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

func health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "gateway"})
}

// proxyWS me-relay dua arah antara client dan ai-service.
func proxyWS(c *gin.Context, cfg *config.Config) {
	client, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("upgrade client: %v", err)
		return
	}
	defer client.Close()

	upstreamURL := wsURL(cfg.AIServiceURL) + "/ws/session"
	upstream, _, err := websocket.DefaultDialer.Dial(upstreamURL, nil)
	if err != nil {
		log.Printf("dial ai-service: %v", err)
		_ = client.WriteMessage(websocket.TextMessage, []byte(`{"type":"error","message":"ai-service tidak tersedia"}`))
		return
	}
	defer upstream.Close()

	done := make(chan struct{}, 2)

	go func() {
		defer func() { done <- struct{}{} }()
		for {
			mt, msg, err := client.ReadMessage()
			if err != nil {
				_ = upstream.WriteMessage(websocket.TextMessage, []byte(`{"type":"interrupt"}`))
				return
			}
			if err := upstream.WriteMessage(mt, msg); err != nil {
				return
			}
		}
	}()

	go func() {
		defer func() { done <- struct{}{} }()
		for {
			mt, msg, err := upstream.ReadMessage()
			if err != nil {
				return
			}
			if err := client.WriteMessage(mt, msg); err != nil {
				return
			}
		}
	}()

	<-done
	client.Close()
	upstream.Close()
	<-done
}

func wsURL(base string) string {
	switch {
	case strings.HasPrefix(base, "http://"):
		return "ws://" + strings.TrimPrefix(base, "http://")
	case strings.HasPrefix(base, "https://"):
		return "wss://" + strings.TrimPrefix(base, "https://")
	default:
		return "ws://" + base
	}
}

func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Next()
	}
}
