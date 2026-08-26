package providers

import (
	"humi/gateway/internal/config"
	"humi/gateway/internal/server"

	"github.com/samber/do/v2"
)

func InitDatabase(injector do.Injector) {

}

func RegisterProviders(injector do.Injector) {
	do.Provide(injector, func(_ do.Injector) (*config.Config, error) {
		return config.Load()
	})
	do.Provide(injector, func(i do.Injector) (*server.Server, error) {
		cfg := do.MustInvoke[*config.Config](i)
		return server.New(cfg), nil
	})
}
