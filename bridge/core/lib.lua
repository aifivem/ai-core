-- ai-lib inside ai-core: the bridge loads the copy in bridge/lib (refreshed from ai-lib on every build), because
-- ai-lib itself starts after ai-core. Modules load on first use, like in any other resource.

AiLibResource = 'ai-core'
AiLibRoot = 'bridge/lib/'
