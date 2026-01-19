import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/screens/NewPatient.tsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Mail, Camera, Image as ImageIcon, Trash2, Calendar, User, MapPin, CreditCard, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase/client";
import AppLayout from "../components/Layout/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
const NewPatient = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [cpf, setCpf] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [address, setAddress] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [photoFile, setPhotoFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    // ✅ Upload da foto para o Supabase Storage (mantém sua lógica)
    const uploadPhotoToStorage = async (file) => {
        try {
            setUploading(true);
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();
            if (listError)
                throw listError;
            const bucketExists = buckets?.some((bucket) => bucket.name === "patient-photos");
            if (!bucketExists) {
                const { error: createError } = await supabase.storage.createBucket("patient-photos", {
                    public: true,
                    fileSizeLimit: 5242880, // 5MB
                });
                if (createError)
                    throw createError;
            }
            const fileExt = file.name.split(".").pop();
            const fileName = `patient_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            const filePath = fileName;
            const { error: uploadError } = await supabase.storage.from("patient-photos").upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
            });
            if (uploadError) {
                console.error("Erro no upload:", uploadError);
                throw uploadError;
            }
            const { data: { publicUrl }, } = supabase.storage.from("patient-photos").getPublicUrl(filePath);
            toast.success("Foto salva com sucesso!");
            return publicUrl;
        }
        catch (error) {
            console.error("Erro ao fazer upload da foto:", error);
            toast.error("Erro ao salvar a foto. Tente novamente.");
            return null;
        }
        finally {
            setUploading(false);
        }
    };
    const handleSubmit = async () => {
        if (!name || !phone || !cpf || !birthDate) {
            toast.error("Por favor, preencha todos os campos obrigatórios.");
            return;
        }
        setLoading(true);
        try {
            let finalPhotoUrl = "";
            if (photoFile) {
                const uploadedUrl = await uploadPhotoToStorage(photoFile);
                if (uploadedUrl) {
                    finalPhotoUrl = uploadedUrl;
                    if (photoUrl.startsWith("blob:"))
                        URL.revokeObjectURL(photoUrl);
                }
                else {
                    throw new Error("Falha ao salvar a foto");
                }
            }
            const { data, error } = await supabase
                .from("patients")
                .insert([
                {
                    name,
                    email: email || null,
                    phone,
                    cpf,
                    birth_date: birthDate,
                    address: address || null,
                    photo_url: finalPhotoUrl || null,
                    professional_id: "a3f11e68-67ea-4a9f-b1fb-33d9843a738f",
                },
            ])
                .select();
            if (error)
                throw error;
            if (data && data.length > 0) {
                const patientId = data[0].id;
                toast.success("Paciente cadastrado com sucesso!");
                navigate(`/patients/${patientId}`);
            }
            else {
                throw new Error("Nenhum dado retornado após inserção");
            }
        }
        catch (error) {
            console.error("Erro ao cadastrar paciente:", error);
            toast.error("Erro ao cadastrar paciente. Tente novamente.");
        }
        finally {
            setLoading(false);
        }
    };
    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (!file.type.startsWith("image/")) {
            toast.error("Por favor, selecione um arquivo de imagem (JPEG, PNG, etc).");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("A imagem deve ter no máximo 5MB.");
            return;
        }
        setPhotoFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPhotoUrl(objectUrl);
        toast.success("Foto selecionada! Ela será salva permanentemente quando você cadastrar o paciente.");
    };
    const handleTakePhoto = () => {
        if (!fileInputRef.current)
            return;
        fileInputRef.current.accept = "image/*";
        // @ts-ignore
        fileInputRef.current.capture = "camera";
        fileInputRef.current.click();
    };
    const handleChooseFromLibrary = () => {
        if (!fileInputRef.current)
            return;
        fileInputRef.current.accept = "image/*";
        fileInputRef.current.removeAttribute("capture");
        fileInputRef.current.click();
    };
    const removePhoto = () => {
        if (photoUrl.startsWith("blob:"))
            URL.revokeObjectURL(photoUrl);
        setPhotoFile(null);
        setPhotoUrl("");
        if (fileInputRef.current)
            fileInputRef.current.value = "";
        toast.success("Foto removida");
    };
    const formatPhone = (value) => {
        const numbers = value.replace(/\D/g, "");
        if (numbers.length <= 11) {
            // evita "quebrar" quando ainda está digitando
            if (numbers.length < 11)
                return value;
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        }
        return value;
    };
    const formatCPF = (value) => {
        const numbers = value.replace(/\D/g, "");
        if (numbers.length <= 11) {
            if (numbers.length < 11)
                return value;
            return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        }
        return value;
    };
    const handlePhoneChange = (e) => setPhone(formatPhone(e.target.value));
    const handleCpfChange = (e) => setCpf(formatCPF(e.target.value));
    return (_jsx(AppLayout, { title: "Novo Paciente", showBack: true, children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "glass-card p-8 relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" }), _jsxs("div", { className: "relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6", children: [_jsx("div", { className: "flex-1", children: _jsxs("div", { className: "flex items-center gap-4 mb-4", children: [_jsx("div", { className: "p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30", children: _jsx(Sparkles, { className: "text-blue-300", size: 28 }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("h1", { className: "text-3xl font-bold glow-text mb-2", children: "Cadastrar Novo Paciente" }), _jsx("p", { className: "text-gray-300 text-lg", children: "Preencha as informa\u00E7\u00F5es para cadastrar um novo paciente na cl\u00EDnica." })] })] }) }), _jsx("div", { className: "p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10", children: _jsx(User, { className: "text-cyan-300", size: 28 }) })] })] }), _jsx("input", { type: "file", ref: fileInputRef, onChange: handleFileSelect, accept: "image/*", className: "hidden" }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsx("div", { className: "lg:col-span-1", children: _jsxs("div", { className: "glass-card p-6 border border-white/10", children: [_jsxs("h3", { className: "text-lg font-bold text-white mb-4 flex items-center gap-2", children: [_jsx(Camera, { className: "text-purple-300", size: 20 }), _jsx("span", { children: "Foto do Paciente" })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex justify-center", children: _jsxs("div", { className: "relative", children: [_jsx("div", { className: "w-36 h-36 rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-white/5 flex items-center justify-center", children: photoUrl ? (_jsx("img", { src: photoUrl, alt: name || "Foto do paciente", className: "w-full h-full object-cover", onError: (e) => {
                                                                    const target = e.target;
                                                                    target.style.display = "none";
                                                                } })) : (_jsx(Camera, { className: "text-gray-400", size: 40 })) }), photoUrl && (_jsx("button", { type: "button", onClick: removePhoto, className: "absolute -top-2 -right-2 bg-red-500/90 text-white rounded-full p-2 shadow-lg hover:bg-red-500 transition-all", title: "Remover foto", children: _jsx(Trash2, { size: 14 }) }))] }) }), _jsxs("div", { className: "space-y-3", children: [_jsxs("button", { type: "button", onClick: handleTakePhoto, disabled: uploading || loading, className: "w-full px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2", children: [_jsx(Camera, { size: 18, className: "text-cyan-300" }), _jsx("span", { className: "font-semibold", children: "Tirar Foto" })] }), _jsxs("button", { type: "button", onClick: handleChooseFromLibrary, disabled: uploading || loading, className: "w-full px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2", children: [_jsx(ImageIcon, { size: 18, className: "text-purple-300" }), _jsx("span", { className: "font-semibold", children: "Escolher da Galeria" })] })] }), (uploading || loading) && (_jsxs("div", { className: "flex items-center justify-center gap-2 text-sm text-gray-300", children: [_jsx(LoadingSpinner, { size: "sm", className: "text-blue-500" }), _jsx("span", { children: uploading ? "Salvando foto..." : "Cadastrando..." })] })), _jsx("div", { className: "glass-card p-4 border border-blue-400/20 bg-blue-500/10", children: _jsx("p", { className: "text-sm text-blue-100 text-center", children: "\uD83D\uDCF8 A foto ser\u00E1 salva permanentemente e aparecer\u00E1 em todo o sistema." }) })] })] }) }), _jsxs("div", { className: "lg:col-span-2", children: [_jsxs("div", { className: "glass-card p-6 border border-white/10", children: [_jsxs("h3", { className: "text-lg font-bold text-white mb-6 flex items-center gap-2", children: [_jsx(User, { className: "text-cyan-300", size: 20 }), _jsx("span", { children: "Informa\u00E7\u00F5es Pessoais" })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Nome Completo *" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", placeholder: "Digite o nome completo do paciente", required: true })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Telefone *" }), _jsxs("div", { className: "relative", children: [_jsx(Phone, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", size: 18 }), _jsx("input", { type: "text", value: phone, onChange: handlePhoneChange, className: "w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", placeholder: "(11) 99999-9999", required: true, maxLength: 15 })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Email" }), _jsxs("div", { className: "relative", children: [_jsx(Mail, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", size: 18 }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", placeholder: "paciente@email.com" })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "CPF *" }), _jsxs("div", { className: "relative", children: [_jsx(CreditCard, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", size: 18 }), _jsx("input", { type: "text", value: cpf, onChange: handleCpfChange, className: "w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", placeholder: "000.000.000-00", required: true, maxLength: 14 })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Data de Nascimento *" }), _jsxs("div", { className: "relative", children: [_jsx(Calendar, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", size: 18 }), _jsx("input", { type: "date", value: birthDate, onChange: (e) => setBirthDate(e.target.value), className: "w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", required: true })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Endere\u00E7o Completo" }), _jsxs("div", { className: "relative", children: [_jsx(MapPin, { className: "absolute left-3 top-3 text-gray-400", size: 18 }), _jsx("input", { type: "text", value: address, onChange: (e) => setAddress(e.target.value), className: "w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", placeholder: "Rua, n\u00FAmero, bairro, cidade - Estado" })] })] })] })] }), _jsx("button", { type: "button", onClick: handleSubmit, disabled: loading || uploading, className: "w-full mt-6 neon-button", children: loading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx(LoadingSpinner, { size: "sm", className: "text-blue-500" }), "Cadastrando Paciente..."] })) : uploading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx(LoadingSpinner, { size: "sm", className: "text-blue-500" }), "Salvando Foto..."] })) : (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx(User, { size: 20 }), "Cadastrar Paciente"] })) })] })] })] }) }));
};
export default NewPatient;
