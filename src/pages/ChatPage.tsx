import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Feather, Lock as LockIcon } from 'lucide-react';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import NewChatModal from '../components/NewChatModal';
import NiyamModal from '../components/NiyamModal';
import ForwardModal from '../components/ForwardModal';
import LockPinModal from '../components/LockPinModal';
import ProfileCard from '../components/ProfileCard';
import Toast from '../components/Toast';
import MandalaSpinner from '../components/MandalaSpinner';
import { useBootstrap } from '../hooks/useBootstrap';
import { usePresenceHeartbeat } from '../hooks/usePresence';
import { useChatUI, applyThemeClass } from '../store/chatStore';
import { apiFetch } from '../lib/api';
import { buildForward } from '../lib/markers';

/** The messenger's home — sidebar + chat stage, locks, forwards, governance. */
export default function ChatPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useBootstrap();
  usePresenceHeartbeat();

  const activeChatId = useChatUI((s) => s.activeChatId);
  const newChatOpen = useChatUI((s) => s.newChatOpen);
  const niyamOpen = useChatUI((s) => s.niyamOpen);
  const dark = useChatUI((s) => s.dark);
  const locked = useChatUI((s) => s.locked);
  const unlocked = useChatUI((s) => s.unlocked);
  const initGuards = useChatUI((s) => s.initGuards);
  const askLockPin = useChatUI((s) => s.askLockPin);
  const openChat = useChatUI((s) => s.openChat);
  const forward = useChatUI((s) => s.forward);
  const closeForward = useChatUI((s) => s.closeForward);
  const showToast = useChatUI((s) => s.showToast);

  const [forwarding, setForwarding] = useState(false);

  useEffect(() => { applyThemeClass(dark); }, [dark]);
  useEffect(() => { if (data?.me) initGuards(data.me.id); }, [data?.me, initGuards]);

  const activeChat = data?.chats.find((c) => c.id === activeChatId) ?? null;
  const isSealed = !!activeChat && locked.includes(activeChat.id) && !unlocked.includes(activeChat.id);
  const bhandarId = data?.chats.find((c) => c.is_bhandar)?.id ?? null;

  const onForward = async (targetIds: string[]) => {
    if (!data) return;
    const fromTitle = data.chats.find((c) => c.id === useChatUI.getState().activeChatId)?.title || 'a thread';
    setForwarding(true);
    try {
      for (const id of targetIds) {
        await apiFetch('/api/chat/messages', {
          method: 'POST',
          body: JSON.stringify({
            chat_id: id,
            content: buildForward(forward.content || '', fromTitle),
            media_url: forward.mediaUrl,
          }),
        });
      }
      closeForward();
      showToast(targetIds.length > 1 ? `Carried onward to ${targetIds.length} threads` : 'Carried onward');
      qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
      if (targetIds.length === 1) openChat(targetIds[0]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'The courier stumbled');
    } finally {
      setForwarding(false);
    }
  };

  if (isError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-sandalwood dark:bg-midnight">
        <div className="text-center">
          <MandalaSpinner size={52} />
          <p className="mt-4 font-serif text-lg text-charcoal dark:text-glow">The courier lost the path.</p>
          <button onClick={() => refetch()} className="mt-4 rounded-full bg-neem px-6 py-2.5 font-serif text-sm text-cream shadow-turmeric transition hover:bg-neem-deep dark:bg-turmeric dark:text-charcoal">
            Send the courier again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-sandalwood dark:bg-midnight">
      <div className={`h-full w-full shrink-0 lg:w-auto ${activeChat ? 'hidden lg:block' : 'block'}`}>
        <ChatSidebar data={data} isLoading={isLoading} />
      </div>

      <div className={`chat-weave h-full min-w-0 flex-1 ${activeChat ? 'block' : 'hidden lg:block'}`}>
        <AnimatePresence mode="wait">
          {activeChat && data?.me ? (
            isSealed ? (
              <motion.div
                key={`sealed-${activeChat.id}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="grid h-full place-items-center"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ y: [0, -6, 0], rotate: [0, -3, 3, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-turmeric/60 bg-turmeric/10 text-turmeric-deep shadow-turmeric dark:text-turmeric"
                  >
                    <LockIcon size={30} />
                  </motion.div>
                  <h2 className="mt-5 font-serif text-2xl text-neem-deep dark:text-glow">This thread is sealed.</h2>
                  <p className="mx-auto mt-2 max-w-[280px] text-[13.5px] text-charcoal-mute dark:text-glow-dim">Your mantra alone parts these curtains.</p>
                  <button
                    onClick={() => askLockPin(activeChat.id)}
                    className="mt-6 rounded-full bg-neem px-6 py-2.5 font-serif text-sm text-cream shadow-turmeric transition hover:bg-neem-deep dark:bg-turmeric dark:text-charcoal"
                  >
                    Speak the mantra
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={activeChat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="h-full"
              >
                <ChatWindow chat={activeChat} me={data.me} bhandarId={bhandarId} />
              </motion.div>
            )
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hidden h-full lg:grid lg:place-items-center"
            >
              <div className="text-center">
                <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}>
                  <Feather size={44} className="mx-auto text-copper/60 dark:text-glow-dim/60" />
                </motion.div>
                <h2 className="mt-5 font-serif text-2xl text-neem-deep dark:text-glow">Choose a thread, or kindle one.</h2>
                <p className="mx-auto mt-2 max-w-[300px] text-[13.5px] leading-relaxed text-charcoal-mute dark:text-glow-dim">
                  Sakhis, circles and Sanghas wait on the left. The golden spark is Snehra — she acts as well as answers.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>{newChatOpen && <NewChatModal key="new-chat" />}</AnimatePresence>
      <AnimatePresence>{niyamOpen && data?.me && <NiyamModal key="niyam" me={data.me} />}</AnimatePresence>
      {data && (
        <ForwardModal chats={data.chats} currentChatId={activeChatId} sending={forwarding} onForward={onForward} />
      )}
      {data?.me && <LockPinModal meId={data.me.id} onUnlocked={(id) => openChat(id)} />}
      {data?.me && <ProfileCard me={data.me} />}
      <Toast />
    </div>
  );
}
