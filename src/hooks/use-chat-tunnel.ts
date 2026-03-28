import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CHAT_RELAY_URL } from '../constants/chat';
import type { ChatMessage, ChatMessageType, FoodAnalysis } from '../types/database';

// Token is embedded at build time for the PWA
const CHAT_TOKEN = process.env.EXPO_PUBLIC_CHAT_TOKEN ?? '';

interface UseChatTunnelReturn {
  sendAnalysis: (params: {
    photos: { uri: string; name: string; type: string }[];
    description: string;
    messageType: ChatMessageType;
  }) => Promise<string | null>;
  sendChat: (content: string) => Promise<string | null>;
  response: ChatMessage | null;
  sending: boolean;
  error: string | null;
  clearResponse: () => void;
}

export function useChatTunnel(): UseChatTunnelReturn {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ChatMessage | null>(null);
  const pendingMessageId = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to realtime updates for responses
  useEffect(() => {
    const channel = supabase
      .channel('chat-responses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: 'direction=eq.oraion',
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg.status === 'complete') {
            setResponse(msg);
            setSending(false);
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const sendAnalysis = useCallback(
    async (params: {
      photos: { uri: string; name: string; type: string }[];
      description: string;
      messageType: ChatMessageType;
    }): Promise<string | null> => {
      setSending(true);
      setError(null);
      setResponse(null);

      try {
        const formData = new FormData();
        formData.append('message_type', params.messageType);
        formData.append('description', params.description);

        for (const photo of params.photos) {
          // On web, fetch the URI and create a blob
          const resp = await fetch(photo.uri);
          const blob = await resp.blob();
          formData.append('photos', blob, photo.name);
        }

        const res = await fetch(`${CHAT_RELAY_URL}/analyze`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${CHAT_TOKEN}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        pendingMessageId.current = data.id;
        return data.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send';
        setError(message);
        setSending(false);
        return null;
      }
    },
    [],
  );

  const sendChat = useCallback(async (content: string): Promise<string | null> => {
    setSending(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`${CHAT_RELAY_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CHAT_TOKEN}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      pendingMessageId.current = data.id;
      return data.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send';
      setError(message);
      setSending(false);
      return null;
    }
  }, []);

  const clearResponse = useCallback(() => {
    setResponse(null);
    setError(null);
    pendingMessageId.current = null;
  }, []);

  return { sendAnalysis, sendChat, response, sending, error, clearResponse };
}
