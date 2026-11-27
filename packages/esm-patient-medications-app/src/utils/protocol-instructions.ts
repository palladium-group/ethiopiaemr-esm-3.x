/**
 * The server HTML-encodes `<`, `>` and `&` in saved text. Decode before displaying it or sending it
 * back, otherwise the entities show up literally and get encoded a second time on the next save.
 */
export function unescapeRestText(value?: string | null): string {
  let current = value ?? '';
  let previous: string;
  do {
    previous = current;
    current = previous
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&amp;/g, '&');
  } while (current !== previous);
  return current;
}

export interface ProtocolInstructions {
  /** Name of the order set the order was placed from, as it was at ordering time. */
  name: string;
  instructions: string;
}

const protocolPrefix = 'Protocol: ';

/**
 * Orders placed from an order set that has protocol instructions carry a snapshot of them in the
 * order's `instructions` field: the order set name on the first line, then the instructions.
 */
export function buildProtocolInstructions(orderSetName: string, instructions: string): string {
  return `${protocolPrefix}${orderSetName.trim()}\n${instructions.trim()}`;
}

export function parseProtocolInstructions(orderInstructions?: string | null): ProtocolInstructions | null {
  const text = unescapeRestText(orderInstructions).trim();
  if (!text.startsWith(protocolPrefix)) {
    return null;
  }

  const [firstLine, ...rest] = text.split('\n');
  const name = firstLine.slice(protocolPrefix.length).trim();
  if (!name) {
    return null;
  }

  return { name, instructions: rest.join('\n').trim() };
}

/** Distinct protocols among a group of orders, in first-seen order. */
export function getDistinctProtocolInstructions(
  orders: Array<{ instructions?: string | null }>,
): Array<ProtocolInstructions> {
  const protocols = new Map<string, ProtocolInstructions>();
  for (const order of orders) {
    const protocol = parseProtocolInstructions(order.instructions);
    if (protocol) {
      const key = `${protocol.name}\n${protocol.instructions}`;
      if (!protocols.has(key)) {
        protocols.set(key, protocol);
      }
    }
  }
  return Array.from(protocols.values());
}
