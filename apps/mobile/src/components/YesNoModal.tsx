import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

interface Props {
  visible: boolean;
  question: string;
  onYes: () => void;
  onNo: () => void;
}

export function YesNoModal({ visible, question, onYes, onNo }: Props) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.icon}>?</Text>
            <Text style={styles.title}>Question</Text>
          </View>

          <Text style={styles.question}>{question}</Text>

          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.noButton]} onPress={onNo}>
              <Text style={styles.noButtonText}>No</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.yesButton]} onPress={onYes}>
              <Text style={styles.yesButtonText}>Yes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
    color: '#ffffff',
    fontWeight: 'bold',
    backgroundColor: '#333333',
    width: 36,
    height: 36,
    borderRadius: 18,
    textAlign: 'center',
    lineHeight: 36,
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  question: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  noButton: {
    backgroundColor: '#333333',
  },
  yesButton: {
    backgroundColor: '#ffffff',
  },
  noButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  yesButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
