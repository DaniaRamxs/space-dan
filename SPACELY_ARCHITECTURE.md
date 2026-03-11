# Spacely Architecture

**Live Social Activity Platform**

Spacely combines Reddit-style content discovery, Discord-style communities, and VRChat-style live experiences into a unified platform where "something is always happening."

---

## 🏗️ Three-Layer Architecture

### Layer 1: Social Layer (Reddit-like)

**Purpose**: Content discovery and engagement

**Features**:
- Global feed
- Community feeds
- Posts (text, media, activity links)
- Reactions and comments
- Category filtering

**Routes**:
- `/feed` - Global activity feed
- `/posts` - Main feed (current implementation)
- `/post/:id` - Individual post view
- `/transmission/:postId` - Post detail page

**Implementation**:
- Frontend: `ActivityFeed.jsx`, `PostsPage.jsx`
- Backend: Supabase `activity_posts` table
- Service: `activityService.js`

---

### Layer 2: Community Layer (Discord-like)

**Purpose**: Organize users around shared interests

**Structure**:
```
Community
├── Feed (community-specific posts)
├── Activities (live experiences)
├── Voice (persistent voice channels)
└── Members (community roster)
```

**Routes**:
- `/communities` - Browse all communities
- `/community/:slug` - Individual community view

**Features**:
- Create/join/leave communities
- Community-specific feeds
- Live activity discovery within communities
- Member management

**Implementation**:
- Frontend: `CommunitiesPage.jsx`, `CommunityPage.jsx`, `CommunityCard.jsx`
- Backend: `server/modules/social/communities/`
- Database: `communities`, `community_members` tables

---

### Layer 3: Experience Layer (VRChat-like)

**Purpose**: Real-time shared experiences

**Activity Types**:
- 🎙️ Voice rooms
- 📺 Watch together
- 🎵 Music rooms
- 🎮 Mini games
- ✨ Interactive rooms

**Features**:
- One-click join
- Live participant/spectator counts
- Host controls
- Real-time synchronization
- Activity presence (see what friends are doing)

**Implementation**:
- Frontend: `LiveActivityCard.jsx`, `useColyseusRoom.js`
- Backend: `LiveActivityRoom.mjs` (Colyseus)
- Service: `liveActivitiesService.js`
- Database: `activities`, `activity_participants` tables

---

## 🔥 Viral Growth Features

### 1. Activity Cards in Feed

Activities appear as discoverable cards in the main feed:

```
Tetris Duel
Dan vs Lyra

3 spectators watching
2 minutes ago

[Join]
```

### 2. Zero Friction Join

- No invites required
- No role selection
- No multi-step onboarding
- Users enter first, decide later

### 3. Trending Algorithm

Activities surface based on engagement score:

```javascript
score = (participants * 2) + spectators + min(duration_minutes, 60)
```

### 4. Activity Presence

Users see what friends are doing in real-time:

```
Dan is in:
Watch Party - Spirited Away
Community: Anime Universe

[Join them]
```

### 5. Public Square Effect

High-engagement activities appear globally:

```
48 people watching

Watching: Interstellar
Community: Space Lovers

[Join]
```

---

## 🛠️ Technical Stack

### Frontend (Vercel)

**Framework**: React + Vite
**Styling**: TailwindCSS
**Animation**: Framer Motion
**Routing**: React Router
**State**: Context API
**Realtime**: Colyseus.js client

**Key Services**:
- `communitiesService.js` - Community CRUD
- `liveActivitiesService.js` - Activity management
- `activityService.js` - Posts and feed
- `colyseusClient.js` - Realtime connection

**Key Components**:
- `CommunityCard.jsx` - Community preview
- `LiveActivityCard.jsx` - Activity preview
- `ActivityFeed.jsx` - Feed renderer
- `ActivityDiscoveryBanner.jsx` - Trending activities

**Key Pages**:
- `CommunitiesPage.jsx` - Browse communities
- `CommunityPage.jsx` - Individual community
- `PostsPage.jsx` - Global feed
- `GamesPage.jsx` - Games catalog

---

### Backend (Railway)

**Framework**: Express + Node.js
**Realtime**: Colyseus
**Database**: Supabase (PostgreSQL)
**Auth**: Supabase Auth

**Modular Structure**:
```
server/
├── modules/
│   └── social/
│       ├── communities/
│       │   ├── communities.service.mjs
│       │   ├── communities.controller.mjs
│       │   └── communities.routes.mjs
│       ├── activities/
│       │   ├── activities.service.mjs
│       │   ├── activities.controller.mjs
│       │   └── activities.routes.mjs
│       └── index.mjs
├── rooms/
│   ├── LiveActivityRoom.mjs (generic activity room)
│   ├── GameRoom.mjs (base game room)
│   └── [specific game rooms...]
├── schema/
│   ├── LiveActivityState.mjs
│   └── [game state schemas...]
└── index.mjs (main server)
```

**REST Endpoints**:

**Communities**:
- `POST /api/communities` - Create community
- `GET /api/communities` - List communities
- `GET /api/communities/:slug` - Get community
- `POST /api/communities/:id/join` - Join community
- `POST /api/communities/:id/leave` - Leave community
- `GET /api/communities/:id/members` - Get members

**Activities**:
- `POST /api/activities` - Create activity
- `GET /api/activities/trending` - Get trending
- `GET /api/activities/:id` - Get activity
- `POST /api/activities/:id/join` - Join activity
- `POST /api/activities/:id/leave` - Leave activity
- `POST /api/activities/:id/end` - End activity (host only)
- `GET /api/activities/user/current` - Get user's current activity

**Colyseus Rooms**:
- `live-activity` - Generic activity room (voice, watch, music)
- `blackjack`, `poker`, `chess`, etc. - Game rooms
- `starboard` - Collaborative whiteboard
- `beat_sound` - Music rhythm game

---

## 📊 Database Schema

### Communities Table

```sql
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  creator_id UUID REFERENCES profiles(id),
  avatar_url TEXT,
  banner_url TEXT,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Community Members Table

```sql
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);
```

### Activities Table

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- voice, watch, music, game, interactive
  title TEXT NOT NULL,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  host_id UUID REFERENCES profiles(id),
  room_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active', -- active, paused, ended
  participant_count INTEGER DEFAULT 0,
  spectator_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
```

### Activity Participants Table

```sql
CREATE TABLE activity_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_spectator BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ
);
```

### Helper Functions

```sql
-- Increment community member count
CREATE OR REPLACE FUNCTION increment_community_members(community_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE communities SET member_count = member_count + 1 WHERE id = community_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement community member count
CREATE OR REPLACE FUNCTION decrement_community_members(community_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = community_id;
END;
$$ LANGUAGE plpgsql;

-- Increment activity participant count
CREATE OR REPLACE FUNCTION increment_activity_participants(activity_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE activities SET participant_count = participant_count + 1 WHERE id = activity_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement activity participant count
CREATE OR REPLACE FUNCTION decrement_activity_participants(activity_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE activities SET participant_count = GREATEST(0, participant_count - 1) WHERE id = activity_id;
END;
$$ LANGUAGE plpgsql;

-- Increment activity spectator count
CREATE OR REPLACE FUNCTION increment_activity_spectators(activity_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE activities SET spectator_count = spectator_count + 1 WHERE id = activity_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement activity spectator count
CREATE OR REPLACE FUNCTION decrement_activity_spectators(activity_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE activities SET spectator_count = GREATEST(0, spectator_count - 1) WHERE id = activity_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚀 Implementation Roadmap

### ✅ Phase 1: Foundation (Current)

- [x] Modular backend structure
- [x] REST API for communities
- [x] REST API for activities
- [x] LiveActivityRoom (Colyseus)
- [x] CommunityCard component
- [x] LiveActivityCard component
- [x] CommunitiesPage
- [x] CommunityPage
- [x] Router integration

### 🔄 Phase 2: Core Features (Next)

- [ ] Database migrations (create tables)
- [ ] Community creation UI
- [ ] Activity creation UI
- [ ] Activity detail page (`/activity/:id`)
- [ ] Join activity flow (REST → Colyseus)
- [ ] Activity presence system
- [ ] Friend activity feed

### 🎯 Phase 3: Discovery & Engagement

- [ ] Trending algorithm implementation
- [ ] Activity highlights in feed
- [ ] Public activities section
- [ ] Community search and filters
- [ ] Activity notifications
- [ ] Activity history

### 🌟 Phase 4: Advanced Features

- [ ] Voice room integration
- [ ] Watch together sync
- [ ] Music room controls
- [ ] Activity recommendations
- [ ] Community analytics
- [ ] Moderation tools

---

## 🎮 Activity Flow

### Creating an Activity

1. User clicks "Create Activity" in community
2. Frontend: `POST /api/activities` with type, title, communityId
3. Backend: Creates activity record in DB, returns activityId
4. Frontend: Joins Colyseus room `live-activity` with activityId
5. Activity appears in community and trending feeds

### Joining an Activity

1. User clicks "Join" on activity card
2. Frontend: `POST /api/activities/:id/join`
3. Backend: Records participation in DB
4. Frontend: Connects to Colyseus room with activityId
5. User enters live experience instantly

### Activity Lifecycle

```
Created → Active → [Paused] → Ended
   ↓        ↓                    ↓
  DB      Colyseus            Archive
```

---

## 🔌 Integration Points

### Existing Features

**Already Integrated**:
- ✅ ActivityFeed component
- ✅ Colyseus client setup
- ✅ useColyseusRoom hook
- ✅ Auth context
- ✅ Supabase client

**Needs Integration**:
- [ ] Link posts to activities
- [ ] Show activity status in feed
- [ ] Activity presence in profiles
- [ ] Community badges/roles

---

## 📈 Scalability Considerations

### Performance

- **Colyseus**: Only for realtime sync (voice, games, watch)
- **REST**: For discovery, feeds, metadata
- **Caching**: Feed cache (client-side), activity cache
- **Pagination**: All lists support offset/limit

### Cost Optimization

- **Railway**: Auto-dispose idle rooms
- **Vercel**: Edge caching for static content
- **Supabase**: RPC functions for atomic operations
- **WebSocket**: 15s ping interval (reduced traffic)

### Monitoring

- Health endpoint: `/health`
- Memory tracking
- Room lifecycle logging
- Error handling with graceful degradation

---

## 🎯 Design Principles

1. **Zero Friction**: Join activities in one click
2. **Activity-Centric**: Everything revolves around live experiences
3. **Discovery-First**: Surface interesting activities automatically
4. **Presence-Aware**: Show what friends are doing
5. **Modular**: Clean separation of concerns
6. **Scalable**: Designed for growth from day one

---

## 🔗 Quick Links

**Backend**:
- Main server: `server/index.mjs`
- Social modules: `server/modules/social/`
- Colyseus rooms: `server/rooms/`
- Schemas: `server/schema/`

**Frontend**:
- Communities: `frontend/src/pages/CommunitiesPage.jsx`
- Community view: `frontend/src/pages/CommunityPage.jsx`
- Services: `frontend/src/services/`
- Components: `frontend/src/components/Communities/`, `frontend/src/components/Activities/`

**Database**:
- Migrations: `supabase/migrations/`
- Schema: See "Database Schema" section above

---

## 🚀 Next Steps

1. **Run migrations** to create communities and activities tables
2. **Test REST endpoints** with Postman/Thunder Client
3. **Create first community** via API or UI
4. **Test activity creation** and join flow
5. **Implement activity detail page**
6. **Connect activity presence** to user profiles
7. **Deploy to Railway** and verify Colyseus rooms work

---

**Spacely**: Where something is always happening. 🌌
