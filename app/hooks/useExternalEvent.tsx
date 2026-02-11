import * as ctools from '@/app/tools/ctools';
import { useEffect } from 'react';

export default function useExternalEvent() {
  useEffect(() => {
    const handle = async (event: any) => {
      console.log('Received EXTERNAL_EVENT with detail:', event.detail);
      const response = await fetch('/api/tweet-summaries/existing');
      const data = await response.json();
      const collectFromMapExistingTweetIds: Record<string, string[]> = data.collectFromMapExistingTweetIds || {};
      Object.entries(collectFromMapExistingTweetIds).forEach(([collectFrom, existingTweetIds]) => {
        console.log(`Collecting from ${collectFrom} with existing tweet IDs:`, existingTweetIds);
        ctools.collectLatestTweets(collectFrom, existingTweetIds).then((data) => {
          console.log('Tweets collected successfully:', data);
        }).catch((error) => {
          console.error('Error collecting tweets:', error);
        });
      });
    };
    document.addEventListener('EXTERNAL_EVENT', handle);
    return () => {
      document.removeEventListener('EXTERNAL_EVENT', handle);
    };
  }, []);
}