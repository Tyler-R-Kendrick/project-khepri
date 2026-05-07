# COBOL Claims Batch And CICS Sample

Scenario id: `cobol-claims-batch-and-cics`

Replay command: run the eligibility records in `fixtures/eligibility-records.fixed` through `programs/ELIGBLTY.CBL`, using `copybooks/CUSTOMER.CPY`, then compare the generated report with `expected/eligibility-report.txt`.

Regression evidence must preserve:

- EBCDIC field interpretation before converting records to UTF-8 fixtures.
- Packed decimal amount handling for claim totals.
- Restart checkpoint semantics from the nightly JCL batch.
