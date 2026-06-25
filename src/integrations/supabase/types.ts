export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_eventos: {
        Row: {
          aluno_id: string | null
          created_at: string
          fim: string
          id: string
          inicio: string
          observacao: string | null
          personal_id: string
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          aluno_id?: string | null
          created_at?: string
          fim: string
          id?: string
          inicio: string
          observacao?: string | null
          personal_id: string
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string | null
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          observacao?: string | null
          personal_id?: string
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_eventos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos: {
        Row: {
          address: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          gender: string | null
          goal: string | null
          id: string
          notes: string | null
          personal_id: string
          phone: string | null
          photo_url: string | null
          plan_expires_at: string | null
          profession: string | null
          status: string
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          gender?: string | null
          goal?: string | null
          id?: string
          notes?: string | null
          personal_id: string
          phone?: string | null
          photo_url?: string | null
          plan_expires_at?: string | null
          profession?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          goal?: string | null
          id?: string
          notes?: string | null
          personal_id?: string
          phone?: string | null
          photo_url?: string | null
          plan_expires_at?: string | null
          profession?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      anamneses: {
        Row: {
          alcool: string | null
          alergias: string | null
          alimentacao: string | null
          aluno_id: string
          assinatura_aluno: string | null
          atividade_descricao: string | null
          cirurgias: string | null
          created_at: string
          data_anamnese: string
          dias_treino_semana: number | null
          doencas_cronicas: string | null
          experiencia_musculacao: string | null
          faixa_agua: string | null
          faixa_sono: string | null
          fumante: boolean | null
          gosta_treinar: string | null
          hidratacao_litros: number | null
          historico_familiar: string | null
          horario_preferido: string | null
          horas_sono: number | null
          id: string
          ja_desistiu: string | null
          ja_treinou: boolean | null
          lesoes: string | null
          liberacao_medica: boolean | null
          maior_dificuldade: string | null
          medicamentos: string | null
          motivacao: string | null
          motivo_procura: string | null
          nao_gosta_treinar: string | null
          nivel_motivacao: number | null
          nivel_stress: string | null
          objetivo_principal: string | null
          objetivo_principal_tipo: string | null
          objetivo_secundario: string | null
          observacoes_gerais: string | null
          parq_dor_peito: boolean | null
          parq_medicamento_pressao: boolean | null
          parq_observacoes: string | null
          parq_outras_razoes: boolean | null
          parq_pressao_alta: boolean | null
          parq_problema_cardiaco: boolean | null
          parq_problema_osseo: boolean | null
          parq_tontura: boolean | null
          personal_id: string
          pratica_atividade: boolean | null
          prazo_objetivo: string | null
          qualidade_sono: string | null
          regiao_desconforto: string | null
          regiao_desenvolver: string | null
          satisfacao_corporal: number | null
          tempo_inatividade: string | null
          updated_at: string
        }
        Insert: {
          alcool?: string | null
          alergias?: string | null
          alimentacao?: string | null
          aluno_id: string
          assinatura_aluno?: string | null
          atividade_descricao?: string | null
          cirurgias?: string | null
          created_at?: string
          data_anamnese?: string
          dias_treino_semana?: number | null
          doencas_cronicas?: string | null
          experiencia_musculacao?: string | null
          faixa_agua?: string | null
          faixa_sono?: string | null
          fumante?: boolean | null
          gosta_treinar?: string | null
          hidratacao_litros?: number | null
          historico_familiar?: string | null
          horario_preferido?: string | null
          horas_sono?: number | null
          id?: string
          ja_desistiu?: string | null
          ja_treinou?: boolean | null
          lesoes?: string | null
          liberacao_medica?: boolean | null
          maior_dificuldade?: string | null
          medicamentos?: string | null
          motivacao?: string | null
          motivo_procura?: string | null
          nao_gosta_treinar?: string | null
          nivel_motivacao?: number | null
          nivel_stress?: string | null
          objetivo_principal?: string | null
          objetivo_principal_tipo?: string | null
          objetivo_secundario?: string | null
          observacoes_gerais?: string | null
          parq_dor_peito?: boolean | null
          parq_medicamento_pressao?: boolean | null
          parq_observacoes?: string | null
          parq_outras_razoes?: boolean | null
          parq_pressao_alta?: boolean | null
          parq_problema_cardiaco?: boolean | null
          parq_problema_osseo?: boolean | null
          parq_tontura?: boolean | null
          personal_id: string
          pratica_atividade?: boolean | null
          prazo_objetivo?: string | null
          qualidade_sono?: string | null
          regiao_desconforto?: string | null
          regiao_desenvolver?: string | null
          satisfacao_corporal?: number | null
          tempo_inatividade?: string | null
          updated_at?: string
        }
        Update: {
          alcool?: string | null
          alergias?: string | null
          alimentacao?: string | null
          aluno_id?: string
          assinatura_aluno?: string | null
          atividade_descricao?: string | null
          cirurgias?: string | null
          created_at?: string
          data_anamnese?: string
          dias_treino_semana?: number | null
          doencas_cronicas?: string | null
          experiencia_musculacao?: string | null
          faixa_agua?: string | null
          faixa_sono?: string | null
          fumante?: boolean | null
          gosta_treinar?: string | null
          hidratacao_litros?: number | null
          historico_familiar?: string | null
          horario_preferido?: string | null
          horas_sono?: number | null
          id?: string
          ja_desistiu?: string | null
          ja_treinou?: boolean | null
          lesoes?: string | null
          liberacao_medica?: boolean | null
          maior_dificuldade?: string | null
          medicamentos?: string | null
          motivacao?: string | null
          motivo_procura?: string | null
          nao_gosta_treinar?: string | null
          nivel_motivacao?: number | null
          nivel_stress?: string | null
          objetivo_principal?: string | null
          objetivo_principal_tipo?: string | null
          objetivo_secundario?: string | null
          observacoes_gerais?: string | null
          parq_dor_peito?: boolean | null
          parq_medicamento_pressao?: boolean | null
          parq_observacoes?: string | null
          parq_outras_razoes?: boolean | null
          parq_pressao_alta?: boolean | null
          parq_problema_cardiaco?: boolean | null
          parq_problema_osseo?: boolean | null
          parq_tontura?: boolean | null
          personal_id?: string
          pratica_atividade?: boolean | null
          prazo_objetivo?: string | null
          qualidade_sono?: string | null
          regiao_desconforto?: string | null
          regiao_desenvolver?: string | null
          satisfacao_corporal?: number | null
          tempo_inatividade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      avaliacoes_fisicas: {
        Row: {
          altura: number | null
          aluno_id: string
          circ_abdomen: number | null
          circ_antebraco_d: number | null
          circ_antebraco_e: number | null
          circ_antebraco_relax_d: number | null
          circ_antebraco_relax_e: number | null
          circ_braco_contr_d: number | null
          circ_braco_contr_e: number | null
          circ_braco_d: number | null
          circ_braco_e: number | null
          circ_braco_relax_d: number | null
          circ_braco_relax_e: number | null
          circ_cintura: number | null
          circ_coxa_d: number | null
          circ_coxa_distal_d: number | null
          circ_coxa_distal_e: number | null
          circ_coxa_e: number | null
          circ_coxa_medial_d: number | null
          circ_coxa_medial_e: number | null
          circ_coxa_prox_d: number | null
          circ_coxa_prox_e: number | null
          circ_ombro: number | null
          circ_panturrilha_d: number | null
          circ_panturrilha_e: number | null
          circ_pescoco: number | null
          circ_quadril: number | null
          circ_torax: number | null
          created_at: string
          data_avaliacao: string
          densidade_corporal: number | null
          diametro_femur: number | null
          diametro_punho: number | null
          diametro_umero: number | null
          dobra_abdominal: number | null
          dobra_axilar_media: number | null
          dobra_coxa: number | null
          dobra_peitoral: number | null
          dobra_subescapular: number | null
          dobra_suprailiaca: number | null
          dobra_triceps: number | null
          fc_repouso: number | null
          genero: string | null
          id: string
          idade: number | null
          imc: number | null
          imc_classificacao: string | null
          massa_gorda: number | null
          massa_magra: number | null
          neuro_abdominal_1min: number | null
          neuro_flexao_1min: number | null
          neuro_preensao_d: number | null
          neuro_preensao_e: number | null
          neuro_salto_vertical: number | null
          neuro_sentar_alcancar: number | null
          observacoes: string | null
          percentual_gordura: number | null
          personal_id: string
          peso: number | null
          peso_ideal_max: number | null
          peso_ideal_min: number | null
          postural: Json | null
          pressao_diastolica: number | null
          pressao_sistolica: number | null
          protocolo: string | null
          rcq: number | null
          rcq_classificacao: string | null
          updated_at: string
          vo2_classificacao: string | null
          vo2_distancia: number | null
          vo2_fc_final: number | null
          vo2_protocolo: string | null
          vo2_resultado: number | null
        }
        Insert: {
          altura?: number | null
          aluno_id: string
          circ_abdomen?: number | null
          circ_antebraco_d?: number | null
          circ_antebraco_e?: number | null
          circ_antebraco_relax_d?: number | null
          circ_antebraco_relax_e?: number | null
          circ_braco_contr_d?: number | null
          circ_braco_contr_e?: number | null
          circ_braco_d?: number | null
          circ_braco_e?: number | null
          circ_braco_relax_d?: number | null
          circ_braco_relax_e?: number | null
          circ_cintura?: number | null
          circ_coxa_d?: number | null
          circ_coxa_distal_d?: number | null
          circ_coxa_distal_e?: number | null
          circ_coxa_e?: number | null
          circ_coxa_medial_d?: number | null
          circ_coxa_medial_e?: number | null
          circ_coxa_prox_d?: number | null
          circ_coxa_prox_e?: number | null
          circ_ombro?: number | null
          circ_panturrilha_d?: number | null
          circ_panturrilha_e?: number | null
          circ_pescoco?: number | null
          circ_quadril?: number | null
          circ_torax?: number | null
          created_at?: string
          data_avaliacao?: string
          densidade_corporal?: number | null
          diametro_femur?: number | null
          diametro_punho?: number | null
          diametro_umero?: number | null
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          fc_repouso?: number | null
          genero?: string | null
          id?: string
          idade?: number | null
          imc?: number | null
          imc_classificacao?: string | null
          massa_gorda?: number | null
          massa_magra?: number | null
          neuro_abdominal_1min?: number | null
          neuro_flexao_1min?: number | null
          neuro_preensao_d?: number | null
          neuro_preensao_e?: number | null
          neuro_salto_vertical?: number | null
          neuro_sentar_alcancar?: number | null
          observacoes?: string | null
          percentual_gordura?: number | null
          personal_id: string
          peso?: number | null
          peso_ideal_max?: number | null
          peso_ideal_min?: number | null
          postural?: Json | null
          pressao_diastolica?: number | null
          pressao_sistolica?: number | null
          protocolo?: string | null
          rcq?: number | null
          rcq_classificacao?: string | null
          updated_at?: string
          vo2_classificacao?: string | null
          vo2_distancia?: number | null
          vo2_fc_final?: number | null
          vo2_protocolo?: string | null
          vo2_resultado?: number | null
        }
        Update: {
          altura?: number | null
          aluno_id?: string
          circ_abdomen?: number | null
          circ_antebraco_d?: number | null
          circ_antebraco_e?: number | null
          circ_antebraco_relax_d?: number | null
          circ_antebraco_relax_e?: number | null
          circ_braco_contr_d?: number | null
          circ_braco_contr_e?: number | null
          circ_braco_d?: number | null
          circ_braco_e?: number | null
          circ_braco_relax_d?: number | null
          circ_braco_relax_e?: number | null
          circ_cintura?: number | null
          circ_coxa_d?: number | null
          circ_coxa_distal_d?: number | null
          circ_coxa_distal_e?: number | null
          circ_coxa_e?: number | null
          circ_coxa_medial_d?: number | null
          circ_coxa_medial_e?: number | null
          circ_coxa_prox_d?: number | null
          circ_coxa_prox_e?: number | null
          circ_ombro?: number | null
          circ_panturrilha_d?: number | null
          circ_panturrilha_e?: number | null
          circ_pescoco?: number | null
          circ_quadril?: number | null
          circ_torax?: number | null
          created_at?: string
          data_avaliacao?: string
          densidade_corporal?: number | null
          diametro_femur?: number | null
          diametro_punho?: number | null
          diametro_umero?: number | null
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          fc_repouso?: number | null
          genero?: string | null
          id?: string
          idade?: number | null
          imc?: number | null
          imc_classificacao?: string | null
          massa_gorda?: number | null
          massa_magra?: number | null
          neuro_abdominal_1min?: number | null
          neuro_flexao_1min?: number | null
          neuro_preensao_d?: number | null
          neuro_preensao_e?: number | null
          neuro_salto_vertical?: number | null
          neuro_sentar_alcancar?: number | null
          observacoes?: string | null
          percentual_gordura?: number | null
          personal_id?: string
          peso?: number | null
          peso_ideal_max?: number | null
          peso_ideal_min?: number | null
          postural?: Json | null
          pressao_diastolica?: number | null
          pressao_sistolica?: number | null
          protocolo?: string | null
          rcq?: number | null
          rcq_classificacao?: string | null
          updated_at?: string
          vo2_classificacao?: string | null
          vo2_distancia?: number | null
          vo2_fc_final?: number | null
          vo2_protocolo?: string | null
          vo2_resultado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_fisicas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas_vencimento: {
        Row: {
          ativo: boolean
          canal: string
          created_at: string
          criado_por: string | null
          dias_antes: number
          id: string
          nome: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          canal?: string
          created_at?: string
          criado_por?: string | null
          dias_antes: number
          id?: string
          nome: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          canal?: string
          created_at?: string
          criado_por?: string | null
          dias_antes?: number
          id?: string
          nome?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_vencimento_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mensagens_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_valores: {
        Row: {
          contexto: string
          created_at: string
          custom_field_id: string
          id: string
          registro_id: string
          updated_at: string
          valor: Json | null
        }
        Insert: {
          contexto: string
          created_at?: string
          custom_field_id: string
          id?: string
          registro_id: string
          updated_at?: string
          valor?: Json | null
        }
        Update: {
          contexto?: string
          created_at?: string
          custom_field_id?: string
          id?: string
          registro_id?: string
          updated_at?: string
          valor?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_valores_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          ativo: boolean
          contexto: string
          created_at: string
          id: string
          label: string
          obrigatorio: boolean
          opcoes: Json | null
          ordem: number
          subgrupo: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          contexto: string
          created_at?: string
          id?: string
          label: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          subgrupo?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          contexto?: string
          created_at?: string
          id?: string
          label?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          subgrupo?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercicio_categorias: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          icone: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      exercicios: {
        Row: {
          categoria: string | null
          categoria_id: string | null
          created_at: string
          created_by: string | null
          equipamento: string | null
          gif_url: string | null
          grupo_muscular: string
          id: string
          imagem_url: string | null
          instrucoes: string | null
          is_publico: boolean
          musculos_alvo: string[] | null
          musculos_secundarios: string | null
          nivel: string | null
          nome: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          categoria?: string | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          equipamento?: string | null
          gif_url?: string | null
          grupo_muscular: string
          id?: string
          imagem_url?: string | null
          instrucoes?: string | null
          is_publico?: boolean
          musculos_alvo?: string[] | null
          musculos_secundarios?: string | null
          nivel?: string | null
          nome: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          categoria?: string | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          equipamento?: string | null
          gif_url?: string | null
          grupo_muscular?: string
          id?: string
          imagem_url?: string | null
          instrucoes?: string | null
          is_publico?: boolean
          musculos_alvo?: string[] | null
          musculos_secundarios?: string | null
          nivel?: string | null
          nome?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercicios_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "exercicio_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos_evolucao: {
        Row: {
          aluno_id: string
          angulo: string
          created_at: string
          data_foto: string
          id: string
          observacoes: string | null
          personal_id: string
          peso: number | null
          storage_path: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          angulo: string
          created_at?: string
          data_foto?: string
          id?: string
          observacoes?: string | null
          personal_id: string
          peso?: number | null
          storage_path: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          angulo?: string
          created_at?: string
          data_foto?: string
          id?: string
          observacoes?: string | null
          personal_id?: string
          peso?: number | null
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_evolucao_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_enviadas: {
        Row: {
          aluno_id: string | null
          campanha_id: string | null
          canal: string
          corpo: string | null
          created_at: string
          destinatario: string | null
          enviado_por: string | null
          id: string
          status: string | null
          template_id: string | null
        }
        Insert: {
          aluno_id?: string | null
          campanha_id?: string | null
          canal: string
          corpo?: string | null
          created_at?: string
          destinatario?: string | null
          enviado_por?: string | null
          id?: string
          status?: string | null
          template_id?: string | null
        }
        Update: {
          aluno_id?: string | null
          campanha_id?: string | null
          canal?: string
          corpo?: string | null
          created_at?: string
          destinatario?: string | null
          enviado_por?: string | null
          id?: string
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_enviadas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_enviadas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas_vencimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_enviadas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mensagens_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_templates: {
        Row: {
          assunto: string | null
          canal: string
          corpo: string
          created_at: string
          id: string
          nome: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          assunto?: string | null
          canal?: string
          corpo: string
          created_at?: string
          id?: string
          nome: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          assunto?: string | null
          canal?: string
          corpo?: string
          created_at?: string
          id?: string
          nome?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      metas: {
        Row: {
          aluno_id: string
          created_at: string
          data_alvo: string | null
          data_inicio: string
          descricao: string
          id: string
          observacoes: string | null
          personal_id: string
          status: string
          tipo: string
          unidade: string | null
          updated_at: string
          valor_alvo: number | null
          valor_atual: number | null
          valor_inicial: number | null
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_alvo?: string | null
          data_inicio?: string
          descricao: string
          id?: string
          observacoes?: string | null
          personal_id: string
          status?: string
          tipo: string
          unidade?: string | null
          updated_at?: string
          valor_alvo?: number | null
          valor_atual?: number | null
          valor_inicial?: number | null
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_alvo?: string | null
          data_inicio?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          personal_id?: string
          status?: string
          tipo?: string
          unidade?: string | null
          updated_at?: string
          valor_alvo?: number | null
          valor_atual?: number | null
          valor_inicial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_financeiras: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          personal_id: string | null
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          personal_id?: string | null
          updated_at?: string
          valor_centavos?: number
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          personal_id?: string | null
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: []
      }
      permissoes: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          modulo: Database["public"]["Enums"]["app_module"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          modulo: Database["public"]["Enums"]["app_module"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          modulo?: Database["public"]["Enums"]["app_module"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planos_alimentares: {
        Row: {
          agua_litros: number | null
          aluno_id: string
          ativo: boolean
          carboidrato_g: number | null
          created_at: string
          gordura_g: number | null
          id: string
          kcal_alvo: number | null
          nome: string
          objetivo: string | null
          observacoes: string | null
          personal_id: string
          proteina_g: number | null
          updated_at: string
        }
        Insert: {
          agua_litros?: number | null
          aluno_id: string
          ativo?: boolean
          carboidrato_g?: number | null
          created_at?: string
          gordura_g?: number | null
          id?: string
          kcal_alvo?: number | null
          nome?: string
          objetivo?: string | null
          observacoes?: string | null
          personal_id: string
          proteina_g?: number | null
          updated_at?: string
        }
        Update: {
          agua_litros?: number | null
          aluno_id?: string
          ativo?: boolean
          carboidrato_g?: number | null
          created_at?: string
          gordura_g?: number | null
          id?: string
          kcal_alvo?: number | null
          nome?: string
          objetivo?: string | null
          observacoes?: string | null
          personal_id?: string
          proteina_g?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_alimentares_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          duracao_meses: number
          id: string
          nome: string
          preco_centavos: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          duracao_meses?: number
          id?: string
          nome: string
          preco_centavos?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          duracao_meses?: number
          id?: string
          nome?: string
          preco_centavos?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      protocolos_avaliacao: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          dobras_necessarias: string[]
          formula: Json
          genero: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dobras_necessarias?: string[]
          formula?: Json
          genero?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dobras_necessarias?: string[]
          formula?: Json
          genero?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      refeicoes: {
        Row: {
          created_at: string
          descricao: string | null
          horario: string | null
          id: string
          kcal: number | null
          nome: string
          ordem: number
          plano_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          horario?: string | null
          id?: string
          kcal?: number | null
          nome: string
          ordem?: number
          plano_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          horario?: string | null
          id?: string
          kcal?: number | null
          nome?: string
          ordem?: number
          plano_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refeicoes_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_alimentares"
            referencedColumns: ["id"]
          },
        ]
      }
      treino_exercicios: {
        Row: {
          carga: string | null
          created_at: string
          descanso_seg: number | null
          exercicio_id: string
          id: string
          metodo: string | null
          observacoes: string | null
          ordem: number
          repeticoes: string | null
          series: number | null
          treino_id: string
          updated_at: string
        }
        Insert: {
          carga?: string | null
          created_at?: string
          descanso_seg?: number | null
          exercicio_id: string
          id?: string
          metodo?: string | null
          observacoes?: string | null
          ordem?: number
          repeticoes?: string | null
          series?: number | null
          treino_id: string
          updated_at?: string
        }
        Update: {
          carga?: string | null
          created_at?: string
          descanso_seg?: number | null
          exercicio_id?: string
          id?: string
          metodo?: string | null
          observacoes?: string | null
          ordem?: number
          repeticoes?: string | null
          series?: number | null
          treino_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treino_exercicios_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treino_exercicios_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinos: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          letra: string
          nome: string | null
          objetivo: string | null
          observacoes: string | null
          ordem: number
          personal_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          letra: string
          nome?: string | null
          objetivo?: string | null
          observacoes?: string | null
          ordem?: number
          personal_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          letra?: string
          nome?: string | null
          objetivo?: string | null
          observacoes?: string | null
          ordem?: number
          personal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          aluno_id: string
          created_at: string
          data_venda: string
          fim_vigencia: string | null
          forma_pagamento: string | null
          id: string
          inicio_vigencia: string
          observacao: string | null
          personal_id: string
          produto_id: string
          status: string
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_venda?: string
          fim_vigencia?: string | null
          forma_pagamento?: string | null
          id?: string
          inicio_vigencia?: string
          observacao?: string | null
          personal_id: string
          produto_id: string
          status?: string
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_venda?: string
          fim_vigencia?: string | null
          forma_pagamento?: string | null
          id?: string
          inicio_vigencia?: string
          observacao?: string | null
          personal_id?: string
          produto_id?: string
          status?: string
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target: string
        }
        Returns: undefined
      }
      admin_transfer_aluno: {
        Args: { _aluno_id: string; _new_personal: string }
        Returns: undefined
      }
      aluno_id_of: { Args: { _uid: string }; Returns: string }
      has_permission: {
        Args: {
          _acao: string
          _modulo: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_personal_of_aluno: {
        Args: { _aluno_id: string; _uid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_module:
        | "dashboard"
        | "alunos"
        | "anamnese"
        | "avaliacoes"
        | "treinos"
        | "exercicios"
        | "nutricao"
        | "metas"
        | "fotos"
        | "permissoes"
      app_role: "admin" | "personal" | "aluno"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_module: [
        "dashboard",
        "alunos",
        "anamnese",
        "avaliacoes",
        "treinos",
        "exercicios",
        "nutricao",
        "metas",
        "fotos",
        "permissoes",
      ],
      app_role: ["admin", "personal", "aluno"],
    },
  },
} as const
