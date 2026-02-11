# Fourth Down Analytics

Fantasy Football Analytics That Actually Matter

## What This Does

Power rankings and analytics for your fantasy football league. Connect your Sleeper account and get insights on team performance, lineup efficiency, and player value.

## Features

- **Power Rankings** - Season-long team rankings with power scores
- **Team Analysis** - Expected wins, luck index, and performance trends
- **Lineup Efficiency** - Measure your decision quality vs optimal lineups
- **Weekly Matchups** - Projections and upset risk analysis
- **Player Value** - VORP analysis for smarter waiver pickups
- **League Meta** - Understand how your league behaves

## Tech Stack

**Frontend:** React  
**Backend:** Node.js / Express  
**Database:** PostgreSQL  
**Auth:** JWT  
**APIs:** Sleeper

## Getting Started
```bash
# Clone repo
git clone https://github.com/yourusername/fourthdownanalytics.git
cd fourthdownanalytics

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run migrations
npm run migrate

# Start dev server
npm run dev
```

## Environment Variables
```
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
SLEEPER_API_BASE_URL=https://api.sleeper.app/v1
PORT=3000
```

## Usage

1. Sign up and login
2. Connect your Sleeper account
3. Select your league
4. View analytics

## License

MIT
