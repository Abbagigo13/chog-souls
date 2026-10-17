# CHOG SOULS Database

The MVP does not require a paid database.

During development we use:

- React state
- localStorage
- FastAPI in-memory state

Eventually the database should contain:

## users

- id
- wallet_address
- created_at

## chogs

- id
- contract_address
- token_id
- owner
- metadata_uri
- traits

## souls

- id
- chog_id
- name
- archetype
- personality
- level
- xp
- mood
- stats
- created_at
- updated_at

## memories

- id
- soul_id
- type
- summary
- importance
- created_at

## events

- id
- soul_id
- type
- payload
- created_at

## relationships

- id
- soul_a
- soul_b
- type
- score
- updated_at

## battles

- id
- challenger
- opponent
- result
- battle_log
- created_at
