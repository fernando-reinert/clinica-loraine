import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
const PublicClinicalRecordScreen = ({ isPublicMode, patientId }) => {
    const navigate = useNavigate();
    const signatureRef = useRef(null); // ✅ Corrigido - mudado para SignatureCanvas
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSignature, setShowSignature] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [record, setRecord] = useState({
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
    return (_jsx("div", { className: "min-h-screen bg-gray-50 pb-20" }));
};
export default PublicClinicalRecordScreen;
