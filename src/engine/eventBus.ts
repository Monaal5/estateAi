import { AuditEvent } from '../types';

type EventListener = (event: AuditEvent) => void;

class EventBus {
  private listeners: EventListener[] = [];
  private seenKeys = new Set<string>();

  public subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public publish(
    eventType: AuditEvent['eventType'],
    tenantId: string,
    actorId: string | undefined,
    actorRole: string | undefined,
    payload: Record<string, any>,
    idempotencyKey?: string
  ): AuditEvent | null {
    if (idempotencyKey && this.seenKeys.has(idempotencyKey)) {
      console.warn(`Idempotency check blocked duplicate event emit for key: ${idempotencyKey}`);
      return null;
    }

    if (idempotencyKey) {
      this.seenKeys.add(idempotencyKey);
    }

    const event: AuditEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      eventType,
      correlationId: `corr_${Math.random().toString(36).substring(2, 9)}`,
      actorId,
      actorRole,
      payload,
      occurredAt: new Date().toISOString(),
    };

    this.listeners.forEach((listener) => listener(event));
    return event;
  }
}

export const eventBus = new EventBus();
