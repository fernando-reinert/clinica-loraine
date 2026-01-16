import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSupabase } from "../contexts/SupabaseContext";
import { toast } from "react-hot-toast";

// Componente AnamneseForm local para resolver o problema de importação
const AnamneseForm: React.FC<{
  record: { [key: string]: any };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ record, handleInputChange }) => {
  const [activeCategory, setActiveCategory] = useState("geral");

  const questions = [
    {
      category: "geral",
      label: "Já fez algum tipo de tratamento estético?",
      field: "previous_treatments_yes",
      detailField: "previous_treatments",
    },
    {
      category: "geral",
      label: "Faz uso de algum medicamento?",
      field: "medications_yes",
      detailField: "medications",
    },
    {
      category: "geral",
      label: "Tem alguma alergia?",
      field: "allergies_yes",
      detailField: "allergies",
    },
    // ... (adicione as outras questões conforme seu código original)
  ];

  const categories = [
    { id: "geral", name: "Geral", icon: "📋" },
    { id: "saude", name: "Saúde", icon: "❤️" },
    { id: "pele", name: "Pele", icon: "✨" },
    { id: "historico", name: "Histórico", icon: "🕒" },
    { id: "habitos", name: "Hábitos", icon: "🏃" },
    { id: "alergias", name: "Alergias", icon: "⚠️" },
    { id: "medicamentos", name: "Medicamentos", icon: "💊" },
  ];

  const filteredQuestions = questions.filter((q) => q.category === activeCategory);

  const handleOptionChange = (field: string, value: any) => {
    handleInputChange({ 
      target: { 
        name: field, 
        value: value,
        type: 'button'
      } 
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const completedQuestions = questions.filter(
    (q) => record[q.field] !== undefined && record[q.field] !== null
  ).length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto my-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Formulário de Anamnese
        </h2>
        <p className="text-gray-600">
          Preencha as informações abaixo para avaliação
        </p>
      </div>

      <div className="mb-8 overflow-x-auto">
        <div className="flex space-x-2 pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                activeCategory === category.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-blue-700">
            {Math.round((completedQuestions / questions.length) * 100)}%
            completo
          </span>
          <span className="text-sm font-medium text-blue-700">
            {completedQuestions}/{questions.length}
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(completedQuestions / questions.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      <div className="space-y-6">
        {filteredQuestions.map((question, index) => (
          <div
            key={index}
            className="bg-gray-50 p-4 rounded-lg border border-gray-200"
          >
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {question.label}
            </label>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleOptionChange(question.field, true)}
                className={`px-4 py-2 rounded-lg border transition-colors flex-1 ${
                  record[question.field] === true
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                Sim
              </button>

              <button
                type="button"
                onClick={() => handleOptionChange(question.field, false)}
                className={`px-4 py-2 rounded-lg border transition-colors flex-1 ${
                  record[question.field] === false
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                Não
              </button>
            </div>

            {record[question.field] === true && question.detailField && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detalhes
                </label>
                <input
                  type="text"
                  name={question.detailField}
                  value={record[question.detailField] || ""}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={`Por favor, forneça mais detalhes sobre ${question.label.toLowerCase()}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => {
            const currentIndex = categories.findIndex(
              (c) => c.id === activeCategory
            );
            const prevCategory =
              currentIndex > 0
                ? categories[currentIndex - 1].id
                : categories[categories.length - 1].id;
            setActiveCategory(prevCategory);
          }}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Categoria Anterior
        </button>
        <button
          onClick={() => {
            const currentIndex = categories.findIndex(
              (c) => c.id === activeCategory
            );
            const nextCategory =
              currentIndex < categories.length - 1
                ? categories[currentIndex + 1].id
                : categories[0].id;
            setActiveCategory(nextCategory);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Próxima Categoria
        </button>
      </div>
    </div>
  );
};

interface ClinicalRecord {
  id?: string;
  patient_id: string;
  full_name: string;
  birth_date: string;
  phone: string;
  email: string;
  address: string;
  allergies: string;
  medications: string;
  medical_conditions: string;
  surgeries: string;
  previous_procedures: string;
  current_skincare: string;
  pregnancy: boolean;
  breastfeeding: boolean;
  smoking: boolean;
  sun_exposure: string;
  alcohol: string;
  skin_type: string;
  main_complaint: string;
  consent: boolean;
  updated_at: string;
  created_at?: string;
}

interface Patient {
  id: string;
  name: string;
  birth_date: string;
  phone: string;
  email: string;
  address: string;
}

const ClinicalRecordScreen: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  
  const [record, setRecord] = useState<{ [key: string]: any }>({});
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  // Carregar dados do paciente e ficha clínica
  useEffect(() => {
    const loadData = async () => {
      if (!patientId) return;

      try {
        setIsLoading(true);

        // Carregar dados do paciente
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();

        if (patientError) throw patientError;
        setPatient(patientData);

        // Carregar ficha clínica existente
        const { data: clinicalRecord, error: recordError } = await supabase
          .from('clinical_records')
          .select('*')
          .eq('patient_id', patientId)
          .single();

        if (!recordError && clinicalRecord) {
          setRecordId(clinicalRecord.id);
          
          // Mapear dados do banco para o formato do formulário
          const formData = {
            previous_treatments_yes: !!clinicalRecord.previous_procedures,
            previous_treatments: clinicalRecord.previous_procedures || '',
            medications_yes: !!clinicalRecord.medications,
            medications: clinicalRecord.medications || '',
            allergies_yes: !!clinicalRecord.allergies,
            allergies: clinicalRecord.allergies || '',
            medical_treatment_yes: !!clinicalRecord.medical_conditions,
            medical_treatment: clinicalRecord.medical_conditions || '',
            surgeries_yes: !!clinicalRecord.surgeries,
            surgeries: clinicalRecord.surgeries || '',
            daily_care_yes: !!clinicalRecord.current_skincare,
            daily_care: clinicalRecord.current_skincare || '',
            pregnant: clinicalRecord.pregnancy || false,
            breastfeeding: clinicalRecord.breastfeeding || false,
            smoker: clinicalRecord.smoking || false,
            sun_exposure: clinicalRecord.sun_exposure === 'Sim',
            alcohol_yes: clinicalRecord.alcohol !== 'Não',
            alcohol_frequency: clinicalRecord.alcohol !== 'Não' ? clinicalRecord.alcohol : '',
            skin_type: clinicalRecord.skin_type || '',
            main_complaint: clinicalRecord.main_complaint || '',
          };
          
          setRecord(formData);
        } else {
          // Inicializar com dados vazios
          setRecord({
            previous_treatments_yes: false,
            previous_treatments: '',
            medications_yes: false,
            medications: '',
            allergies_yes: false,
            allergies: '',
            medical_treatment_yes: false,
            medical_treatment: '',
            surgeries_yes: false,
            surgeries: '',
            daily_care_yes: false,
            daily_care: '',
            pregnant: false,
            breastfeeding: false,
            smoker: false,
            sun_exposure: false,
            alcohol_yes: false,
            alcohol_frequency: '',
            skin_type: '',
            main_complaint: '',
          });
        }

      } catch (error: any) {
        console.error('Erro ao carregar dados:', error);
        if (error.code !== 'PGRST116') {
          toast.error('Erro ao carregar dados do paciente');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [patientId, supabase]);

  // Função para lidar com mudanças no formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    let finalValue: any = value;
    
    // Converter para boolean se for um botão sim/não
    if (type === 'button' || name.includes('_yes')) {
      finalValue = value === 'true';
    }
    
    setRecord(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  // Mapear dados do formulário para o formato do banco de dados
  const mapFormToDatabase = (formData: { [key: string]: any }): ClinicalRecord => {
    return {
      patient_id: patientId ?? "",
      full_name: patient?.name || '',
      birth_date: patient?.birth_date || '',
      phone: patient?.phone || '',
      email: patient?.email || '',
      address: patient?.address || '',
      allergies: formData.allergies_yes ? formData.allergies : '',
      medications: formData.medications_yes ? formData.medications : '',
      medical_conditions: formData.medical_treatment_yes ? formData.medical_treatment : '',
      surgeries: formData.surgeries_yes ? formData.surgeries : '',
      previous_procedures: formData.previous_treatments_yes ? formData.previous_treatments : '',
      current_skincare: formData.daily_care_yes ? formData.daily_care : '',
      pregnancy: formData.pregnant || false,
      breastfeeding: formData.breastfeeding || false,
      smoking: formData.smoker || false,
      sun_exposure: formData.sun_exposure ? 'Sim' : 'Não',
      alcohol: formData.alcohol_yes ? (formData.alcohol_frequency || 'Sim') : 'Não',
      skin_type: formData.skin_type || '',
      main_complaint: formData.main_complaint || '',
      consent: true,
      updated_at: new Date().toISOString(),
    };
  };

  // Salvar ficha clínica
  const saveClinicalRecord = async () => {
    if (!patientId) {
      toast.error('ID do paciente não encontrado');
      return;
    }

    setIsSaving(true);

    try {
      const dataToSave = mapFormToDatabase(record);
      console.log('Dados a serem salvos:', dataToSave);

      let error;
      let result;

      if (recordId) {
        // Atualizar ficha existente
        const { data, error: updateError } = await supabase
          .from('clinical_records')
          .update(dataToSave)
          .eq('id', recordId)
          .select()
          .single();
        
        result = data;
        error = updateError;
      } else {
        // Criar nova ficha
        const { data, error: insertError } = await supabase
          .from('clinical_records')
          .insert([{ 
            ...dataToSave,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        result = data;
        error = insertError;
      }

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      if (result) {
        setRecordId(result.id);
        toast.success('Ficha clínica salva com sucesso!');
        
        setTimeout(() => {
          navigate(`/patients/${patientId}`);
        }, 1000);
      }

    } catch (error: any) {
      console.error('Erro ao salvar ficha clínica:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando ficha clínica...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Ficha Clínica - {patient?.name}
              </h1>
              <p className="text-gray-600">
                Preencha o formulário de anamnese completa do paciente
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate(`/patients/${patientId}`)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={saveClinicalRecord}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Salvando...' : 'Salvar Ficha'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <AnamneseForm 
            record={record}
            handleInputChange={handleInputChange}
          />
        </div>
      </div>
    </div>
  );
};

export default ClinicalRecordScreen;