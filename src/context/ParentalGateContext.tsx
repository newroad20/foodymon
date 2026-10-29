import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { checkGate, makeGateQuestion, type GateQuestion } from '@/lib/parentalGate';

type Guard = (action: () => void, what: string) => void;

const ParentalGateContext = createContext<Guard | null>(null);

/** In kid mode, actions that leave the kid experience ask a grown-up question first. */
export function ParentalGateProvider({ children }: { children: ReactNode }) {
  const { state } = useFoodyMon();
  const [question, setQuestion] = useState<GateQuestion | null>(null);
  const [what, setWhat] = useState('');
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const guard: Guard = useCallback(
    (action, label) => {
      if (!state.kidMode) return action();
      pending.current = action;
      setWhat(label);
      setAnswer('');
      setWrong(false);
      setQuestion(makeGateQuestion());
    },
    [state.kidMode]
  );

  const close = () => {
    pending.current = null;
    setQuestion(null);
  };

  const submit = () => {
    if (!question) return;
    if (!checkGate(question, answer)) {
      setWrong(true);
      setAnswer('');
      setQuestion(makeGateQuestion());
      return;
    }
    const action = pending.current;
    close();
    action?.();
  };

  return (
    <ParentalGateContext.Provider value={guard}>
      {children}
      <Modal visible={question !== null} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.card} accessibilityViewIsModal>
            <Text style={styles.title}>보호자 확인</Text>
            <Text style={styles.body}>{what}은(는) 보호자와 함께 해요. 보호자가 답을 적어 주세요.</Text>
            {question && (
              <Text style={styles.question} accessibilityLabel={`${question.a} 곱하기 ${question.b}는?`}>
                {question.a} × {question.b} = ?
              </Text>
            )}
            <TextInput
              style={styles.input}
              value={answer}
              onChangeText={setAnswer}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="답"
              placeholderTextColor="#94A3B8"
              onSubmitEditing={submit}
              accessibilityLabel="보호자 확인 답"
            />
            {wrong && <Text style={styles.wrong}>답이 달라요. 새 문제로 다시 해 주세요.</Text>}
            <View style={styles.row}>
              <TouchableOpacity style={styles.cancel} onPress={close}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ok} onPress={submit}>
                <Text style={styles.okText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ParentalGateContext.Provider>
  );
}

export function useParentalGate() {
  const guard = useContext(ParentalGateContext);
  if (!guard) throw new Error('useParentalGate must be used within ParentalGateProvider');
  return guard;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    gap: 12,
  },
  title: {
    fontSize: 19,
    color: '#1E293B',
    fontWeight: '900',
  },
  body: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    lineHeight: 20,
  },
  question: {
    fontSize: 28,
    color: '#17765D',
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 20,
    textAlign: 'center',
    color: '#1E293B',
    fontWeight: '800',
    backgroundColor: '#F8FAFC',
  },
  wrong: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '700',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '800',
  },
  ok: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#1B7F66',
  },
  okText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
