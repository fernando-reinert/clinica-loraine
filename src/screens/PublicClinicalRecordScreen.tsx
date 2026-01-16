import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, FileText, FileSignature as Signature, User, HeartPulse, AlertTriangle, ClipboardList, Share2, Mail, MessageSquare } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas'; // ✅ Corrigido - removido ReactSignatureCanvas
import { supabase } from '../services/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface ClinicalRecord {
  id?: string;
  patient_id: string;
  full_name: string;
  birth_date: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
  cpf: string;
  previous_treatments: string;
  previous_treatments_yes: boolean;
  medications: string;
  medications_yes: boolean;
  allergies: string;
  allergies_yes: boolean;
  acid_use: string;
  acid_use_yes: boolean;
  daily_care: string;
  daily_care_yes: boolean;
  medical_treatment: string;
  medical_treatment_yes: boolean;
  surgeries: string;
  surgeries_yes: boolean;
  dermatological_condition: string;
  dermatological_condition_yes: boolean;
  vascular_changes: string;
  vascular_changes_yes: boolean;
  contraceptive_method: string;
  contraceptive_yes: boolean;
  hormonal_replacement_type: string;
  hormonal_replacement_yes: boolean;
  prosthesis_type: string;
  prosthesis_yes: boolean;
  acne_treatment: string;
  acne_heredity_yes: boolean;
  alcohol_frequency: string;
  alcohol_yes: boolean;
  breastfeeding: boolean;
  egg_allergy: boolean;
  bee_allergy: boolean;
  herpes: boolean;
  smoker: boolean;
  sun_exposure: boolean;
  pregnant: boolean;
  exercises: boolean;
  balanced_diet: boolean;
  regular_cycle: boolean;
  easy_bruising: boolean;
  varicose_veins: boolean;
  skin_spots: boolean;
  skin_masses: boolean;
  infectious_disease: boolean;
  organ_disease: boolean;
  fainting: boolean;
  facial_trauma: boolean;
  cardiovascular_disease: boolean;
  respiratory_disorder: boolean;
  weight_changes: boolean;
  diabetes: boolean;
  roacutan_use: boolean;
  keloid_predisposition: boolean;
  notes: string;
  signature_url: string;
  consent: boolean;
  shared_with_patient: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PublicClinicalRecordScreenProps {
  isPublicMode: boolean;
  patientId: string;
}

const PublicClinicalRecordScreen: React.FC<PublicClinicalRecordScreenProps> = ({ isPublicMode, patientId }) => {
  const navigate = useNavigate();
  const signatureRef = useRef<SignatureCanvas>(null); // ✅ Corrigido - mudado para SignatureCanvas
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const [record, setRecord] = useState<ClinicalRecord>({
    patient_id: patientId || '',
    full_name: '',
    birth_date: '',
    gender: '',
    address: '',
    phone: '',
    email: '',
    cpf: '',
    previous_treatments: '',
    previous_treatments_yes: false,
    medications: '',
    medications_yes: false,
    allergies: '',
    allergies_yes: false,
    acid_use: '',
    acid_use_yes: false,
    daily_care: '',
    daily_care_yes: false,
    medical_treatment: '',
    medical_treatment_yes: false,
    surgeries: '',
    surgeries_yes: false,
    dermatological_condition: '',
    dermatological_condition_yes: false,
    vascular_changes: '',
    vascular_changes_yes: false,
    contraceptive_method: '',
    contraceptive_yes: false,
    hormonal_replacement_type: '',
    hormonal_replacement_yes: false,
    prosthesis_type: '',
    prosthesis_yes: false,
    acne_treatment: '',
    acne_heredity_yes: false,
    alcohol_frequency: '',
    alcohol_yes: false,
    breastfeeding: false,
    egg_allergy: false,
    bee_allergy: false,
    herpes: false,
    smoker: false,
    sun_exposure: false,
    pregnant: false,
    exercises: false,
    balanced_diet: false,
    regular_cycle: false,
    easy_bruising: false,
    varicose_veins: false,
    skin_spots: false,
    skin_masses: false,
    infectious_disease: false,
    organ_disease: false,
    fainting: false,
    facial_trauma: false,
    cardiovascular_disease: false,
    respiratory_disorder: false,
    weight_changes: false,
    diabetes: false,
    roacutan_use: false,
    keloid_predisposition: false,
    notes: '',
    signature_url: '',
    consent: false,
    shared_with_patient: false
  });

  // Load patient data and clinical records here...

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Your header and content here */}
    </div>
  );
};

export default PublicClinicalRecordScreen;