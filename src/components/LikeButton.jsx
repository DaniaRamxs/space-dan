import useLikes from '../hooks/useLikes';

/**
 * Cloud-backed heart like button.
 * Count comes from counterapi.dev; liked state is tracked in localStorage.
 * @param {{ postId: string|number }} props
 */
export default function LikeButton({ postId }) {
  const [count, liked, toggle] = useLikes(postId);

  return (
    <button
      className={`likeBtn${liked ? ' liked' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      aria-label={liked ? 'quitar like' : 'dar like'}
      title={liked ? 'quitar like' : 'dar like'}
    >
      {liked ? '♥' : '♡'} {count === null ? '···' : count}
    </button>
  );
}
