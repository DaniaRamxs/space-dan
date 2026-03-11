# Spacely Integration Guide

**Quick reference for connecting communities and activities to the existing Spacely platform.**

---

## 🔌 Integration Points

### 1. Linking Posts to Activities

**Goal**: Posts can represent live activities with a "Join" button.

**Implementation**:

Add `activity_id` field to existing `activity_posts` table:

```sql
ALTER TABLE activity_posts ADD COLUMN activity_id UUID REFERENCES activities(id) ON DELETE SET NULL;
CREATE INDEX idx_activity_posts_activity ON activity_posts(activity_id);
```

**Frontend Changes**:

In `ActivityCard.jsx`, detect if post has an activity:

```jsx
{post.activity_id && (
  <LiveActivityCard activityId={post.activity_id} compact />
)}
```

---

### 2. Activity Presence in Profiles

**Goal**: Show user's current activity in their profile.

**Implementation**:

Query user's current activity:

```javascript
const currentActivity = await liveActivitiesService.getUserCurrentActivity();
```

**Display in Profile**:

```jsx
{currentActivity && (
  <div className="activity-presence">
    <span>Currently in:</span>
    <LiveActivityCard activity={currentActivity} compact />
  </div>
)}
```

---

### 3. Friend Activity Feed

**Goal**: Show what friends are doing in real-time.

**Implementation**:

Create a new feed filter:

```javascript
// In activityService.js
async getFriendActivities(userId) {
  const { data } = await supabase.rpc('get_friend_activities', {
    p_user_id: userId
  });
  return data;
}
```

**SQL Function**:

```sql
CREATE OR REPLACE FUNCTION get_friend_activities(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  activity_id UUID,
  activity_title TEXT,
  activity_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    a.id,
    a.title,
    a.type
  FROM profiles p
  JOIN activity_participants ap ON ap.user_id = p.id
  JOIN activities a ON a.id = ap.activity_id
  WHERE ap.left_at IS NULL
    AND a.status = 'active'
    AND p.id IN (
      SELECT friend_id FROM friendships WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;
```

---

### 4. Trending Activities in Feed

**Goal**: Mix trending activities with posts in the main feed.

**Implementation**:

In `PostsPage.jsx`:

```jsx
const [trendingActivities, setTrendingActivities] = useState([]);

useEffect(() => {
  liveActivitiesService.getTrendingActivities({ limit: 3 })
    .then(setTrendingActivities);
}, []);

// Render before feed
{trendingActivities.map(activity => (
  <LiveActivityCard key={activity.id} activity={activity} />
))}
```

---

### 5. Community Badge in Posts

**Goal**: Show community badge if post is from a community.

**Implementation**:

Add `community_id` to posts:

```sql
ALTER TABLE activity_posts ADD COLUMN community_id UUID REFERENCES communities(id) ON DELETE SET NULL;
```

Display in `ActivityCard.jsx`:

```jsx
{post.community && (
  <div className="community-badge">
    <img src={post.community.avatar_url} />
    <span>{post.community.name}</span>
  </div>
)}
```

---

### 6. Navigation Integration

**Goal**: Add Communities to main navigation.

**Implementation**:

In `Layout.jsx` or navigation component:

```jsx
<NavLink to="/communities">
  <Users size={20} />
  <span>Comunidades</span>
</NavLink>
```

---

### 7. Activity Notifications

**Goal**: Notify users when friends join activities.

**Implementation**:

Use Supabase realtime subscriptions:

```javascript
const channel = supabase
  .channel('friend-activities')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'activity_participants',
    filter: `user_id=in.(${friendIds.join(',')})`
  }, (payload) => {
    showNotification(`${payload.new.username} joined an activity!`);
  })
  .subscribe();
```

---

### 8. Activity History

**Goal**: Show user's past activities.

**Implementation**:

Query completed activities:

```javascript
const { data } = await supabase
  .from('activity_participants')
  .select('activity:activities(*)')
  .eq('user_id', userId)
  .not('left_at', 'is', null)
  .order('left_at', { ascending: false })
  .limit(20);
```

---

## 🎮 Activity Types Implementation

### Voice Room

**Type**: `voice`

**Colyseus Room**: `live-activity`

**Features**:
- Mute/unmute
- Speaking indicator
- Participant list
- Host controls

**Integration**:
```javascript
const { joinActivity } = useLiveActivity(activityId);
await joinActivity(false); // false = not spectator
```

---

### Watch Together

**Type**: `watch`

**Colyseus Room**: `live-activity`

**Metadata**:
```json
{
  "videoUrl": "https://youtube.com/watch?v=...",
  "currentTime": 0,
  "isPlaying": false
}
```

**Host Controls**:
```javascript
updateMetadata({
  currentTime: 120,
  isPlaying: true
});
```

---

### Music Room

**Type**: `music`

**Colyseus Room**: `live-activity`

**Metadata**:
```json
{
  "currentTrack": {
    "title": "Song Name",
    "artist": "Artist",
    "url": "spotify:track:..."
  },
  "queue": []
}
```

---

### Game Room

**Type**: `game`

**Colyseus Room**: Use specific game rooms (`chess`, `tetris`, etc.)

**Note**: Games use their own specialized rooms, not `live-activity`.

---

## 🔄 Migration Path

### Step 1: Database Setup

Run migration:

```bash
# Via Supabase CLI
supabase db push

# Or via SQL Editor in Supabase Dashboard
# Copy contents of supabase/migrations/20260311_communities_activities.sql
```

---

### Step 2: Test REST API

```bash
# Health check
curl https://spacely-server-production.up.railway.app/health

# Create community
curl -X POST https://spacely-server-production.up.railway.app/api/communities \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Community","slug":"test","description":"Testing"}'

# Get communities
curl https://spacely-server-production.up.railway.app/api/communities
```

---

### Step 3: Deploy Backend

```bash
cd server
git add modules/
git commit -m "feat: add communities and activities REST API"
git push
```

Railway will auto-deploy.

---

### Step 4: Deploy Frontend

```bash
cd frontend
npm run build
git add .
git commit -m "feat: add communities pages and activity discovery"
git push
```

Vercel will auto-deploy.

---

### Step 5: Test in Production

1. Visit `https://joinspacely.com/communities`
2. Create first community
3. Create first activity
4. Test join flow
5. Verify Colyseus connection

---

## 🐛 Troubleshooting

### Communities not loading

**Check**:
- Migration ran successfully
- RLS policies are correct
- API endpoint returns data

**Fix**:
```sql
-- Verify table exists
SELECT * FROM communities LIMIT 1;

-- Check RLS
SELECT * FROM pg_policies WHERE tablename = 'communities';
```

---

### Activities not connecting to Colyseus

**Check**:
- LiveActivityRoom is registered in `server/index.mjs`
- Colyseus URL is correct in frontend
- WebSocket connection is allowed (CORS)

**Fix**:
```javascript
// In frontend console
console.log(import.meta.env.VITE_COLYSEUS_URL);
```

---

### Join button not working

**Check**:
- User is authenticated
- Activity exists in database
- Colyseus room is available

**Debug**:
```javascript
// In browser console
const activity = await liveActivitiesService.getActivityById('...');
console.log(activity);
```

---

## 📊 Monitoring

### Backend Health

```bash
curl https://spacely-server-production.up.railway.app/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "memory": { "rss": 150, "heapUsed": 80, "heapTotal": 120 },
  "uptime": 3600,
  "port": 2567,
  "environment": "production"
}
```

---

### Active Rooms

Check Colyseus monitor (if enabled):

```javascript
// In server/index.mjs, add:
import { monitor } from "@colyseus/monitor";
app.use("/colyseus", monitor());
```

Visit: `https://spacely-server-production.up.railway.app/colyseus`

---

## 🎯 Success Criteria

### Technical
- ✅ All REST endpoints respond < 200ms
- ✅ Colyseus rooms connect < 1s
- ✅ Zero 404 errors on new routes
- ✅ Zero MIME type errors
- ✅ Database queries optimized with indexes

### User Experience
- ✅ Communities page loads instantly
- ✅ Activity cards show live counts
- ✅ Join button works in one click
- ✅ No flash of unauthorized content
- ✅ Smooth navigation between pages

### Engagement
- ✅ Users discover communities
- ✅ Users create activities
- ✅ Activities appear in trending
- ✅ Users join activities from feed
- ✅ Activity presence visible

---

## 🔗 Related Files

**Backend**:
- `server/modules/social/` - All social modules
- `server/rooms/LiveActivityRoom.mjs` - Activity room
- `server/schema/LiveActivityState.mjs` - Activity state
- `server/index.mjs` - Main server (routes registered)

**Frontend**:
- `frontend/src/pages/CommunitiesPage.jsx`
- `frontend/src/pages/CommunityPage.jsx`
- `frontend/src/components/Communities/CommunityCard.jsx`
- `frontend/src/components/Activities/LiveActivityCard.jsx`
- `frontend/src/services/communitiesService.js`
- `frontend/src/services/liveActivitiesService.js`
- `frontend/src/hooks/useLiveActivity.js`

**Database**:
- `supabase/migrations/20260311_communities_activities.sql`

**Documentation**:
- `SPACELY_ARCHITECTURE.md` - Full architecture
- `SPACELY_ROADMAP.md` - Implementation roadmap
- `SPACELY_INTEGRATION_GUIDE.md` - This file

---

**Ready to make Spacely a place where something is always happening.** 🚀
