# Java Payment Monolith Sample

Scenario id: `java-payment-monolith`

Replay command: replay `fixtures/jms-replay.jsonl` through the target adapter and compare API contract, transaction boundary, exception mapping, and persistence parity.

Regression evidence must preserve:

- JMS replay order and acknowledgement behavior.
- Transaction boundary behavior across DAO writes and message acknowledgement.
- Classloader resource lookup for application server descriptors.
