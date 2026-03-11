# Spacely Implementation Roadmap

**Goal**: Transform Spacely into a live social activity platform where "something is always happening."

---

## ✅ Phase 1: Foundation (COMPLETED)

### Backend Infrastructure
- [x] Modular REST API structure (`server/modules/social/`)
- [x] Communities service + controller + routes
- [x] Activities service + controller + routes
- [x] LiveActivityRoom (Colyseus) for generic activities
- [x] LiveActivityState schema
- [x] Integration with existing server

### Frontend Infrastructure
- [x] Communities service client
- [x] Live activities service client
- [x] CommunityCard component
- [x] LiveActivityCard component
- [x] CommunitiesPage (`/communities`)
- [x] CommunityPage (`/community/:slug`)
- [x] Router integration with AuthGate

### Database
- [x] SQL migration file created
- [ ] **NEXT**: Run migration in Supabase

---

## 🔄 Phase 2: Core Features (IN PROGRESS)

### Database Setup
- [ ] Run `20260311_communities_activities.sql` migration
- [ ] Verify RLS policies
- [ ] Test helper functions
- [ ] Create sample communities (optional)

### Community Features
- [ ] Create Community UI modal
- [ ] Community settings page
- [ ] Member list component
- [ ] Community roles (member, moderator, admin)
- [ ] Community search improvements

### Activity Features
- [ ] Activity detail page (`/activity/:id`)
- [ ] Create Activity UI modal
- [ ] Activity types selector (voice, watch, music, game)
- [ ] Join activity flow (REST → Colyseus)
- [ ] Leave activity flow
- [ ] Host controls UI

### Integration
- [ ] Link posts to activities (add `activity_id` to posts)
- [ ] Show activity status in feed
- [ ] Activity cards in PostsPage
- [ ] "Join" button in activity posts

---

## 🎯 Phase 3: Discovery & Engagement

### Trending System
- [ ] Implement engagement score calculation
- [ ] Trending activities section in homepage
- [ ] Activity highlights in feed
- [ ] "Hot" indicator for high-engagement activities

### Activity Presence
- [ ] Track user's current activity
- [ ] Show friend activity in feed
- [ ] "Join them" quick action
- [ ] Activity presence in profiles
- [ ] Online status integration

### Feed Improvements
- [ ] Mix activity cards with posts
- [ ] Activity preview cards
- [ ] "Live now" indicator
- [ ] Activity notifications

### Discovery Features
- [ ] Recommended communities
- [ ] Recommended activities
- [ ] "Explore" page improvements
- [ ] Category-based discovery

---

## 🌟 Phase 4: Advanced Features

### Voice Rooms
- [ ] Integrate LiveKit voice with LiveActivityRoom
- [ ] Voice room controls (mute, speaking indicator)
- [ ] Spatial audio (optional)
- [ ] Voice room persistence

### Watch Together
- [ ] YouTube sync integration
- [ ] Watch room controls (play, pause, seek)
- [ ] Chat during watch
- [ ] Watch history

### Music Rooms
- [ ] Spotify integration
- [ ] Music queue system
- [ ] DJ controls
- [ ] Music discovery

### Interactive Rooms
- [ ] Collaborative whiteboard (extend StarboardRoom)
- [ ] Polls and voting
- [ ] Q&A sessions
- [ ] Live events

### Moderation
- [ ] Community moderation tools
- [ ] Activity reporting
- [ ] Ban/kick from activities
- [ ] Content filters

### Analytics
- [ ] Community analytics dashboard
- [ ] Activity metrics
- [ ] User engagement tracking
- [ ] Growth metrics

---

## 🚀 Deployment Checklist

### Backend (Railway)
- [ ] Deploy updated server with social modules
- [ ] Verify Colyseus rooms work
- [ ] Test REST endpoints
- [ ] Monitor memory usage
- [ ] Check auto-dispose behavior

### Frontend (Vercel)
- [ ] Deploy with new routes
- [ ] Verify SPA routing
- [ ] Test cache headers
- [ ] Check service worker
- [ ] Verify favicon and title

### Database (Supabase)
- [ ] Run migrations
- [ ] Test RLS policies
- [ ] Verify helper functions
- [ ] Create indexes
- [ ] Backup before major changes

---

## 📋 Immediate Next Steps

1. **Run Database Migration**
   ```bash
   # In Supabase dashboard or CLI
   psql -f supabase/migrations/20260311_communities_activities.sql
   ```

2. **Test REST Endpoints**
   ```bash
   # Create community
   POST https://spacely-server-production.up.railway.app/api/communities
   
   # Get communities
   GET https://spacely-server-production.up.railway.app/api/communities
   
   # Create activity
   POST https://spacely-server-production.up.railway.app/api/activities
   
   # Get trending
   GET https://spacely-server-production.up.railway.app/api/activities/trending
   ```

3. **Deploy Backend**
   ```bash
   cd server
   git add .
   git commit -m "feat: add communities and activities REST API"
   git push
   ```

4. **Deploy Frontend**
   ```bash
   cd frontend
   npm run build
   git add .
   git commit -m "feat: add communities pages and activity discovery"
   git push
   ```

5. **Test in Production**
   - Visit `/communities`
   - Create first community
   - Create first activity
   - Test join flow
   - Verify Colyseus connection

---

## 🎯 Success Metrics

### Technical
- [ ] Communities API responds < 200ms
- [ ] Activities API responds < 200ms
- [ ] Colyseus room join < 1s
- [ ] Feed loads < 500ms
- [ ] Zero MIME errors
- [ ] Zero 404s on routes

### User Experience
- [ ] One-click join works
- [ ] Activities appear in feed
- [ ] Community discovery is intuitive
- [ ] No flash of unauthorized content
- [ ] Smooth navigation between pages

### Engagement
- [ ] Users create communities
- [ ] Users join activities
- [ ] Activities appear in trending
- [ ] Users discover through feed
- [ ] Repeat visits increase

---

## 🔗 Key Files Reference

**Backend**:
- `server/modules/social/communities/` - Communities module
- `server/modules/social/activities/` - Activities module
- `server/rooms/LiveActivityRoom.mjs` - Generic activity room
- `server/schema/LiveActivityState.mjs` - Activity state schema

**Frontend**:
- `frontend/src/pages/CommunitiesPage.jsx` - Browse communities
- `frontend/src/pages/CommunityPage.jsx` - Individual community
- `frontend/src/components/Communities/CommunityCard.jsx` - Community preview
- `frontend/src/components/Activities/LiveActivityCard.jsx` - Activity preview
- `frontend/src/services/communitiesService.js` - Communities API client
- `frontend/src/services/liveActivitiesService.js` - Activities API client

**Database**:
- `supabase/migrations/20260311_communities_activities.sql` - Schema migration

**Documentation**:
- `SPACELY_ARCHITECTURE.md` - Full architecture overview
- `SPACELY_ROADMAP.md` - This file

---

## 💡 Design Philosophy

**Activity-Centric**: Everything revolves around live experiences
**Zero Friction**: Join in one click, no barriers
**Discovery-First**: Surface interesting activities automatically
**Presence-Aware**: Show what friends are doing
**Scalable**: Modular design for growth

---

**Next milestone**: Run migration and test first community creation 🚀
