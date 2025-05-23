# Code-2-NL

This project aims to provide tools that convert code to queryable knowledge.

## Technologies

### Prebuilt-Solutions

Kythe and Glean (Meta) can be used to index and query codebases.
Sourcegrpah seems to be the standard.

### Intermediary Formats

LSIF & SCIP (Sourcegraph Code-Intelligence Protocol)

## Initial Design

Inputs: language, git-repo, code-snippet, query

Given a language, check if there is an SCIP indexer available for the language.
If there is, stand up a containerized version of it as a sidecar.
If not, generate one with the following steps documented [here](https://sourcegraph.com/docs/code-search/code-navigation/writing_an_indexer#writing-an-indexer):

    1. Familiarize yourself with the SCIP protobuf schema
    1. Import or generate SCIP bindings
    1. Generate minimal index with occurrence information
    1. Test your indexer using scip CLI's snapshot subcommand
    1. Progressively add support for more features with tests
    
Once the container is running, we can use the git-repo to take a snapshot of the repo using the containerized side-car loaded indexer.

Once a snapshot is generated and an SCIP file is produced, we can process this to build a knowledge graph.

1. Query → traverse SCIP/Kythe graph to collect just-enough files
1. Split by tree-sitter into logical chunks, embed, and rank by vector similarity (use code embedding model).
1. Feed top-K chunks + user prompt into Code Specialized LLM.

Additionally,serialise the relevant AST subtree (e.g., S-expression or JSON) and ask the LLM to “explain this structure in human terms.”

Let the model emit step-by-step reasoning (data-flow, invariants) before the final summary; keep the scratchpad hidden from the end-user.

Fine-tune on pairs (signature + body → docstring) mined from open-source; add contrastive pairs with misleading names to force semantic reasoning.

