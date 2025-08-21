-- Migration to add teams structure for padel tournaments
-- Padel is played in teams of 2 players

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(255), -- Optional team name, can be auto-generated from player names
    seed_position INTEGER,
    pair_weight DECIMAL(10,2), -- Calculated weight based on both players' rankings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add team_id to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Update matches table to reference teams instead of individual players
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team1_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team2_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Update tournament_rankings to reference teams
ALTER TABLE tournament_rankings ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Update group_players to reference teams
CREATE TABLE IF NOT EXISTS group_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE(group_id, team_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_team1_id ON matches(team1_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2_id ON matches(team2_id);
CREATE INDEX IF NOT EXISTS idx_tournament_rankings_team_id ON tournament_rankings(team_id);

-- Add constraint to ensure exactly 2 players per team
-- This will be enforced at the application level for now
