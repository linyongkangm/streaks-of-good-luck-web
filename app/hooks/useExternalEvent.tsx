import * as ctools from '@/app/tools/ctools';
import { useEffect } from 'react';

export default function useExternalEvent() {
  useEffect(() => {
    const handle = async (event: any) => {
      console.log('Received EXTERNAL_EVENT with detail:', event.detail);
      event.detail.collectFroms.forEach((collectFrom: string) => {
        ctools.collectLatestTweets(collectFrom).then((data) => {
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