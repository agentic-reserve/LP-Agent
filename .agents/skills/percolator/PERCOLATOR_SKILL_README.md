# Percolator Skill for Kiro

## Overview

A comprehensive skill for developing with the Percolator perpetual futures protocol - an educational research project that implements a novel risk management approach using profit-as-junior-claims instead of traditional Auto-Deleveraging (ADL).

## What's Included

The skill provides complete documentation and guidance for:

### Core Concepts
- **Risk Engine** - Understanding the profit warmup, coverage ratio, and self-healing mechanics
- **Program Architecture** - Solana program structure, account types, and instruction set
- **Matchers** - Creating custom pricing programs (passive, vAMM, or custom logic)
- **Oracles** - Integrating Pyth, Chainlink, or custom price feeds
- **Security** - Critical security requirements and common attack vectors
- **Testing** - Unit tests, formal verification, stress tests, and security pen-testing
- **CLI Guide** - Complete command reference for all operations
- **Deployment** - Step-by-step deployment and monitoring guide
- **Quick Reference** - Formulas, commands, and common patterns

## Skill Structure

```
.agents/skills/percolator/
├── SKILL.md                    # Main skill entry point
├── risk-engine.md              # Core risk mechanics and formulas
├── program-architecture.md     # Solana program structure
├── matchers.md                 # Matcher development guide
├── oracles.md                  # Oracle integration
├── security.md                 # Security considerations
├── testing.md                  # Testing strategy
├── cli-guide.md                # CLI command reference
├── deployment.md               # Deployment guide
└── quick-reference.md          # Quick reference cheat sheet
```

## How to Use

### Activate the Skill

In Kiro, reference the skill with:
```
#percolator
```

Or Kiro will automatically activate it when you mention percolator-related topics.

### Progressive Disclosure

The skill uses progressive disclosure - start with `SKILL.md` for an overview, then dive into specific topics as needed:

- Need to understand the math? → `risk-engine.md`
- Building a matcher? → `matchers.md`
- Integrating oracles? → `oracles.md`
- Security concerns? → `security.md`
- Testing approach? → `testing.md`
- CLI commands? → `cli-guide.md`
- Deploying? → `deployment.md`
- Quick lookup? → `quick-reference.md`

## Key Features

### 1. Comprehensive Coverage
- All aspects of Percolator development
- From core concepts to production deployment
- Security-first approach

### 2. Practical Examples
- Real code snippets
- Working CLI commands
- Complete workflows

### 3. Security Focus
- Critical security requirements highlighted
- Common attack vectors documented
- Security checklist provided

### 4. Testing Guidance
- Multiple testing layers
- Formal verification with Kani
- Stress testing scenarios

### 5. Production Ready
- Deployment procedures
- Monitoring and alerting
- Incident response

## What is Percolator?

Percolator is an educational research project that reimagines perpetual futures risk management:

### Traditional ADL Problem
- Insurance depletes → forcibly close profitable positions
- Unpredictable forced exits
- Manual re-entry required

### Percolator Solution
- Treat profits as "junior claims" (IOUs)
- Global coverage ratio `h` determines backing
- Profits must mature before withdrawal
- System self-heals automatically

### Key Innovation
```
h = min(Residual, Total_Positive_PnL) / Total_Positive_PnL

Where:
  Residual = Vault - Total_Capital - Insurance
```

All profitable accounts share the same haircut proportionally. No forced position closures.

## Quick Start

### 1. Setup
```bash
cd percolator-cli
pnpm install
pnpm build
```

### 2. Configure
Create `~/.config/percolator-cli.json`:
```json
{
  "rpcUrl": "https://api.devnet.solana.com",
  "programId": "2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp",
  "walletPath": "~/.config/solana/id.json"
}
```

### 3. Test on Devnet
```bash
# Get SOL
solana airdrop 2 --url devnet

# Wrap SOL
spl-token wrap 1 --url devnet

# Initialize user
percolator-cli init-user --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs

# Deposit
percolator-cli deposit --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs --user-idx <idx> --amount 50000000

# Trade
percolator-cli keeper-crank --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR

percolator-cli trade-cpi --slab A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs --user-idx <idx> --lp-idx 0 --size 1000 --matcher-program 4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy --matcher-ctx 5n3jT6iy9TK3XNMQarC1sK26zS8ofjLG3dvE9iDEFYhK --oracle 99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR
```

## Important Warnings

⚠️ **EDUCATIONAL RESEARCH PROJECT**
- NOT audited
- NOT production ready
- Do NOT use with real funds
- For learning and testing only

⚠️ **Critical Security Requirements**
- Matchers MUST verify LP PDA signature
- Matcher context + LP MUST be created atomically
- Failure = potential fund theft

⚠️ **Keeper Requirement**
- Risk-increasing trades require recent crank (within 200 slots / ~80s)
- Run keeper before trading or use a keeper bot

## Resources

### Repositories
- Core library: https://github.com/aeyakovenko/percolator
- CLI tool: https://github.com/aeyakovenko/percolator-cli
- Matcher: https://github.com/aeyakovenko/percolator-match
- Main program: https://github.com/aeyakovenko/percolator-prog

### Documentation
- Research paper: https://arxiv.org/abs/2512.01112
- Solana docs: https://docs.solana.com
- Anchor docs: https://www.anchor-lang.com

### Devnet Test Market
- Slab: `A7wQtRT9DhFqYho8wTVqQCDc7kYPTUXGPATiyVbZKVFs`
- Program: `2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp`
- Oracle: `99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR` (Chainlink SOL/USD)

## Contributing

The skill is designed to be comprehensive but can always be improved:
- Add more examples
- Update with new features
- Improve explanations
- Add troubleshooting tips

## License

The Percolator protocol is licensed under Apache 2.0.
This skill documentation follows the same license.

## Acknowledgments

- Percolator protocol by Anatoly Yakovenko
- Research by Tarun Chitra
- Solana Foundation for the blockchain platform
- Kiro team for the AI development environment
