package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/samber/do/v2"

	"humi/gateway/internal/providers"
	"humi/gateway/internal/server"
)

func main() {
	injector := do.New()
	providers.RegisterProviders(injector)

	srv := do.MustInvoke[*server.Server](injector)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.Run()
	}()

	select {
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[gateway] berhenti: %v", err)
		}
		log.Println("[gateway] server closed")
	case <-ctx.Done():
		log.Println("[gateway] sinyal diterima, mematikan gateway")
		srv.Shutdown(5 * time.Second)
	}
}
