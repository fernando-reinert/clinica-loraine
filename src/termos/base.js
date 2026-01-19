/**
 * Classe base para termos de consentimento
 * Facilita a criação de novos termos
 */
import { validateContext, replaceAllPlaceholders } from './utils';
/**
 * Criar definição de termo a partir de template
 */
export function createTermoDefinition(key, label, titleTemplate, contentTemplate) {
    return {
        key,
        label,
        render(ctx) {
            // Validar contexto
            const missingFields = validateContext(ctx);
            if (missingFields.length > 0) {
                return {
                    title: titleTemplate,
                    content: '', // Não renderizar se faltar dados
                    missingFields,
                };
            }
            // Renderizar título
            const title = replaceAllPlaceholders(titleTemplate, ctx);
            // Renderizar conteúdo completo
            const content = replaceAllPlaceholders(contentTemplate, ctx);
            return {
                title,
                content,
                missingFields: [],
            };
        },
    };
}
