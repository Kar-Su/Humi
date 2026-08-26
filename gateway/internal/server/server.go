package server

import (
	"context"
	"log"
	"net/http"
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
	r.GET("/ws", echo)

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

func echo(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("upgrade: %v", err)
		return
	}
	defer conn.Close()
	for {
		mt, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("read: %v", err)
			return
		}
		if err := conn.WriteMessage(mt, msg); err != nil {
			log.Printf("write: %v", err)
			return
		}
	}
}

func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Next()
	}
}
