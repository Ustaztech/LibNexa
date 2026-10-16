import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export const DigitalIDScreen: React.FC = () => {
  const { user, role } = useAuth();

  const matric = user?.matricNumber || user?.membershipNumber || 'NSUK/STUDENT';

  // Render a visual barcode representation using CSS/native bars
  const barcodeChars = (matric + '-LIBNEXA').split('');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Digital Library Pass</Text>
      <Text style={styles.pageSubtitle}>
        Present this pass at the Reader Services circulation counter for physical book collection and returns.
      </Text>

      {/* Pass Card */}
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardOrg}>Nasarawa State University, Keffi</Text>
            <Text style={styles.cardTitle}>University Library Membership</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>ACTIVE</Text>
          </View>
        </View>

        {/* Member Details */}
        <View style={styles.memberSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'U'}</Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{user?.fullName}</Text>
            <Text style={styles.memberRole}>{role} PASS</Text>
            <Text style={styles.memberDept}>{user?.department || 'Faculty of Natural & Applied Sciences'}</Text>
          </View>
        </View>

        {/* Matric / ID Number Callout */}
        <View style={styles.idBox}>
          <Text style={styles.idLabel}>Institutional Identifier</Text>
          <Text style={styles.idValue}>{matric}</Text>
        </View>

        {/* Barcode Visual Representation */}
        <View style={styles.barcodeContainer}>
          <View style={styles.barcodeBars}>
            {barcodeChars.map((char, index) => {
              const code = char.charCodeAt(0);
              const width = (code % 3) + 2;
              const margin = (code % 2) + 1;
              return (
                <View
                  key={index}
                  style={[
                    styles.bar,
                    {
                      width,
                      marginRight: margin,
                      height: 50,
                      backgroundColor: index % 2 === 0 ? '#082B60' : '#1268B3',
                    },
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.barcodeText}>* {matric} *</Text>
        </View>
      </View>

      {/* Guidelines Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Verification Instructions</Text>
        <Text style={styles.infoText}>
          • Scan this identifier barcode at the circulation desk when collecting books.{'\n'}
          • Physical collection must occur within 48 hours of request approval.{'\n'}
          • Books are governed by the standard 14-day university borrowing cycle.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  content: {
    padding: 20,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#082B60',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#66758A',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#082B60',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
    paddingBottom: 14,
  },
  cardOrg: {
    fontSize: 11,
    color: '#66758A',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#082B60',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 18,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1268B3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#082B60',
  },
  memberRole: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#079BA9',
    marginTop: 1,
  },
  memberDept: {
    fontSize: 11,
    color: '#66758A',
    marginTop: 2,
  },
  idBox: {
    backgroundColor: '#F0F6FD',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4E5F9',
  },
  idLabel: {
    fontSize: 10,
    color: '#66758A',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  idValue: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#1268B3',
    marginTop: 2,
  },
  barcodeContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FAFCFE',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  barcodeBars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  bar: {
    borderRadius: 1,
  },
  barcodeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#66758A',
    marginTop: 6,
    letterSpacing: 2,
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#082B60',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 11,
    color: '#66758A',
    lineHeight: 18,
  },
});
