import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';

enum BvStatus {
  'BALANCE' = 'balance',
  'CHARGE' = 'charge',
}

type Props = {
  startDetection: () => void;
};

const CardCheck: React.FC<Props> = ({startDetection}) => {
  const [amount, setAmount] = React.useState<string>('100');
  const [bvStatus, setBvStatus] = React.useState<BvStatus>(BvStatus.CHARGE);
  return (
    <View style={styles.container}>
      <View style={styles.display}></View>
      <View style={styles.btnContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setBvStatus(BvStatus.BALANCE)}
          style={styles.btn}>
          <Text style={styles.btnText}>Check balance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            startDetection();
          }}
          style={styles.btn}>
          <Text style={styles.btnText}>
            {bvStatus !== BvStatus.CHARGE ? 'Charge' : 'Change Balance'}
          </Text>
        </TouchableOpacity>
      </View>
      {bvStatus === BvStatus.CHARGE && (
        <View>
          <TextInput
            style={styles.input}
            value={amount}
            keyboardType="numeric"
            onChangeText={text => setAmount(text)}
          />
          <TouchableOpacity activeOpacity={0.7} style={styles.btn}>
            <Text style={styles.btnText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.lampContainer}>
        <View style={styles.lamp}></View>
        <View style={styles.lamp}></View>
        <View style={styles.lamp}></View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 26,
    paddingHorizontal: 16,
  },
  display: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: Dimensions.get('screen').width * 0.95,
    height: Dimensions.get('screen').height * 0.45,
  },
  btnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 26,
  },
  btn: {
    backgroundColor: '#05445e',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#e4fafc',
    width: Dimensions.get('screen').width * 0.92,
    borderRadius: 12,
    paddingVertical: 8,
    marginBottom: 24,
    fontWeight: '600',
    fontSize: 16,
  },
  lampContainer: {
    flexDirection: 'row',
    marginVertical: 24,
    justifyContent: 'space-around',
    width: Dimensions.get('screen').width * 0.5,
  },
  lamp: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
});

export default CardCheck;
