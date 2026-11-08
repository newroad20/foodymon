import React, { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { HintInput } from '@/components/HintInput';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { levelsData } from '@/constants/foodymonData';
import { buildPetChatOpening, replyToPetChat } from '@/lib/petChat';

interface PetChatModalProps {
  onClose: () => void;
}

interface Message {
  id: number;
  role: 'pet' | 'user';
  text: string;
}

export function PetChatModal({ onClose }: PetChatModalProps) {
  const { state } = useFoodyMon();
  const opening = useMemo(
    () => buildPetChatOpening(state.masterName, state.records, new Date().getHours()),
    [state.masterName, state.records]
  );
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'pet', text: opening.message },
  ]);
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState(opening.suggestions);
  const nextId = useRef(2);
  const scrollRef = useRef<ScrollView>(null);
  const level = levelsData.find((item) => item.level === state.level) ?? levelsData[2];

  const send = (value: string) => {
    const text = value.trim();
    if (!text) return;
    const userMessage: Message = { id: nextId.current++, role: 'user', text };
    const petMessage: Message = {
      id: nextId.current++,
      role: 'pet',
      text: replyToPetChat(text, opening.focus),
    };
    setMessages((current) => [...current, userMessage, petMessage]);
    setDraft('');
    setSuggestions(['조금 더 이야기할래', '오늘은 여기까지']);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.petBadge}>
              <Image source={level.image} style={styles.petImage} resizeMode="contain" />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>푸디몬과 이야기</Text>
              <Text style={styles.status}>오늘의 기록을 보고 말을 걸었어요</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="대화 닫기">
              <Ionicons name="close" size={22} color="#61756B" />
            </TouchableOpacity>
          </View>

          <View style={styles.contextCard}>
            <Ionicons name="sparkles" size={15} color="#4F8D75" />
            <Text style={styles.contextText}>
              오늘 나눈 것 · 수면 {state.records.sleep ? 1 : 0} · 식사 {state.records.meals.length} · 마음 {state.records.minds.length}
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.dayDivider}>오늘</Text>
            {messages.map((message) => (
              <View
                key={message.id}
                style={[styles.messageRow, message.role === 'user' && styles.messageRowUser]}>
                {message.role === 'pet' && (
                  <Image source={level.image} style={styles.messageAvatar} resizeMode="contain" />
                )}
                <View style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.petBubble]}>
                  <Text style={[styles.bubbleText, message.role === 'user' && styles.userBubbleText]}>
                    {message.text}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <TouchableOpacity key={suggestion} style={styles.suggestion} onPress={() => send(suggestion)}>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <HintInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="푸디몬에게 이야기하기"
              placeholderTextColor="#96A49D"
              multiline
              maxLength={300}
              onSubmitEditing={() => send(draft)}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
              onPress={() => send(draft)}
              disabled={!draft.trim()}
              accessibilityLabel="메시지 보내기">
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.privacyNote}>이번 단계의 대화는 저장되거나 외부 AI로 전송되지 않아요.</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 40, 33, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '88%',
    backgroundColor: '#F5FAF7',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D2E0D9',
    alignSelf: 'center',
    marginBottom: 11,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },
  petBadge: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#DFF2E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  petImage: {
    width: 54,
    height: 54,
  },
  onlineDot: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#3E9D78',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#263A31',
    fontSize: 18,
    fontWeight: '900',
  },
  status: {
    color: '#74877E',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE8E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#E5F3EC',
    borderWidth: 1,
    borderColor: '#CEE5DA',
    marginBottom: 8,
  },
  contextText: {
    flex: 1,
    color: '#537164',
    fontSize: 11,
    fontWeight: '800',
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: 4,
    paddingBottom: 18,
  },
  dayDivider: {
    alignSelf: 'center',
    color: '#93A29A',
    fontSize: 10,
    fontWeight: '800',
    paddingVertical: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 11,
    paddingRight: 44,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
    paddingRight: 0,
    paddingLeft: 44,
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    marginRight: 7,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
    maxWidth: '90%',
  },
  petBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#DFE9E4',
  },
  userBubble: {
    backgroundColor: '#277B62',
    borderBottomRightRadius: 6,
  },
  bubbleText: {
    color: '#344A40',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  userBubbleText: {
    color: '#FFFFFF',
  },
  suggestions: {
    gap: 7,
    paddingVertical: 8,
  },
  suggestion: {
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDCCF',
  },
  suggestionText: {
    color: '#36735D',
    fontSize: 12,
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9E7E0',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 88,
    color: '#2C4036',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#277B62',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#B7C9C0',
  },
  privacyNote: {
    color: '#8A9A92',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 7,
  },
});
