package server

import (
	"context"
	"log"
	"net/http"
	"strings"
	"sync"
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

	const writeWait = 10 * time.Second
	const pongWait = 60 * time.Second
	const pingPeriod = 30 * time.Second

	client.SetReadLimit(1 << 20)
	_ = client.SetReadDeadline(time.Now().Add(pongWait))
	client.SetPongHandler(func(string) error {
		_ = client.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	upstream.SetReadLimit(1 << 20)
	_ = upstream.SetReadDeadline(time.Now().Add(pongWait))
	upstream.SetPongHandler(func(string) error {
		_ = upstream.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	var writeMu sync.Mutex
	safeClientWrite := func(mt int, msg []byte) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		_ = client.SetWriteDeadline(time.Now().Add(writeWait))
		return client.WriteMessage(mt, msg)
	}

	done := make(chan struct{}, 2)
	stopPing := make(chan struct{})

	go func() {
		ticker := time.NewTicker(pingPeriod)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				writeMu.Lock()
				_ = client.SetWriteDeadline(time.Now().Add(writeWait))
				_ = client.WriteMessage(websocket.PingMessage, nil)
				writeMu.Unlock()
				_ = upstream.SetWriteDeadline(time.Now().Add(writeWait))
				_ = upstream.WriteMessage(websocket.PingMessage, nil)
			case <-stopPing:
				return
			}
		}
	}()

	go func() {
		defer func() { done <- struct{}{} }()
		for {
			mt, msg, err := client.ReadMessage()
			if err != nil {
				_ = upstream.SetWriteDeadline(time.Now().Add(writeWait))
				_ = upstream.WriteMessage(websocket.TextMessage, []byte(`{"type":"interrupt"}`))
				return
			}
			// app-level ping/pong — jangan teruskan ke ai-service
			if mt == websocket.TextMessage && len(msg) < 64 && isPingMessage(msg) {
				_ = safeClientWrite(websocket.TextMessage, []byte(`{"type":"pong"}`))
				continue
			}
			_ = upstream.SetWriteDeadline(time.Now().Add(writeWait))
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
			if err := safeClientWrite(mt, msg); err != nil {
				return
			}
		}
	}()

	<-done
	close(stopPing)
	client.Close()
	upstream.Close()
	<-done
}

func isPingMessage(msg []byte) bool {
	if len(msg) < 10 {
		return false
	}
	s := string(msg)
	return len(s) < 64 && (s == `{"type":"ping"}` || containsPing(s))
}

func containsPing(s string) bool {
	// tolerate {"type": "ping"} dengan spasi
	for i := 0; i+10 < len(s); i++ {
		if s[i] == '"' && i+6 < len(s) && s[i+1] == 't' {
			if len(s) >= i+15 && s[i:i+7] == `"type"` {
				rest := s[i+7:]
				// cari "ping" setelahnya
				for j := 0; j < len(rest)-4; j++ {
					if rest[j] == '"' && j+5 < len(rest) && rest[j:j+6] == `"ping"` {
						return true
					}
				}
			}
		}
	}
	return false
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
