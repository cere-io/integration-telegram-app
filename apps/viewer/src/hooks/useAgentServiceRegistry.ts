import { useMemo } from 'react';
import { AgentServiceRegistry } from '@tg-app/agent-service-registry';

import { AGENT_SERVICE_REGISTRY_URL } from '../constants';

export const useAgentServiceRegistry = () => {
  return useMemo(() => new AgentServiceRegistry(AGENT_SERVICE_REGISTRY_URL), []);
};
