# Saber LP Token List Generator

Generates the token list of Saber LP tokens.

## Updating the Solana Token List

```
# Update the Solana token list
# This assumes that the token list is in the directory `ROOT/../token-list`.
git fetch upstream
git reset --hard upstream/main
git push origin main

# Build and update
yarn build
yarn copy-to-solana
yarn update-solana-token-list
```

## License

AGPL-3.0
