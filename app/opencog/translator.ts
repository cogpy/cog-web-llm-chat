/**
 * Natural Language to Atomese/MeTTa Translator
 * Uses LLM to translate between natural language and formal representations
 */

import { TranslationRequest, TranslationResponse, Format } from "./types";
import { AtomeseParser } from "./atomese";
import { MeTTaParser } from "./metta";

export class LanguageTranslator {
  private llmApi: any; // Will be injected from web-llm

  constructor(llmApi?: any) {
    this.llmApi = llmApi;
  }

  /**
   * Translate between different formats
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const { input, sourceFormat, targetFormat, context } = request;

    // Direct Atomese <-> MeTTa conversion
    if (sourceFormat === Format.ATOMESE && targetFormat === Format.METTA) {
      return this.atomToMetta(input);
    }
    if (sourceFormat === Format.METTA && targetFormat === Format.ATOMESE) {
      return this.mettaToAtom(input);
    }

    // Use LLM for natural language translations
    if (!this.llmApi) {
      throw new Error("LLM API not configured");
    }

    const prompt = this.buildTranslationPrompt(request);
    const result = await this.callLLM(prompt);

    return {
      output: result,
      sourceFormat,
      targetFormat,
      confidence: 0.85,
    };
  }

  private buildTranslationPrompt(request: TranslationRequest): string {
    const { input, sourceFormat, targetFormat, context } = request;

    let systemPrompt = "";

    if (sourceFormat === Format.NATURAL_LANGUAGE) {
      if (targetFormat === Format.ATOMESE) {
        systemPrompt = `You are an expert in Atomese, the knowledge representation language used in OpenCog.
Convert the following natural language statement into Atomese S-expressions.

Atomese uses the following main constructs:
- ConceptNode: Represents concepts
- PredicateNode: Represents predicates/properties
- InheritanceLink: Represents "is-a" relationships
- SimilarityLink: Represents similarity
- EvaluationLink: Evaluates a predicate on arguments
- ImplicationLink: Represents logical implications
- AndLink, OrLink, NotLink: Logical operators

Example:
Natural: "Cats are animals"
Atomese: (InheritanceLink (ConceptNode "cat") (ConceptNode "animal"))

Example:
Natural: "Socrates is mortal"
Atomese: (InheritanceLink (ConceptNode "Socrates") (ConceptNode "mortal"))

Now convert this statement:
${input}

Provide only the Atomese expression without explanation.`;
      } else if (targetFormat === Format.METTA) {
        systemPrompt = `You are an expert in MeTTa (Meta Type Talk), the hypergraph-based knowledge representation language.
Convert the following natural language statement into MeTTa expressions.

MeTTa uses expressions like:
- Type declarations: (: name Type)
- Function definitions: (= (func args) body)
- Arrow types: (-> Type1 Type2)
- Match expressions: (match expr pattern body)

Example:
Natural: "Define a human type"
MeTTa: (: Human Type)

Example:
Natural: "All humans are mortal"
MeTTa: (= (mortal $x) (if (human $x) True False))

Now convert this statement:
${input}

Provide only the MeTTa expression without explanation.`;
      }
    } else if (targetFormat === Format.NATURAL_LANGUAGE) {
      if (sourceFormat === Format.ATOMESE) {
        systemPrompt = `You are an expert in Atomese. Convert the following Atomese expression into clear, natural English.

Atomese expression:
${input}

Provide a clear, natural language explanation of what this expression means.`;
      } else if (sourceFormat === Format.METTA) {
        systemPrompt = `You are an expert in MeTTa. Convert the following MeTTa expression into clear, natural English.

MeTTa expression:
${input}

Provide a clear, natural language explanation of what this expression means.`;
      }
    }

    if (context) {
      systemPrompt += `\n\nAdditional context: ${context}`;
    }

    return systemPrompt;
  }

  private async callLLM(prompt: string): Promise<string> {
    // This will be implemented to call the actual LLM
    // For now, return a placeholder
    return prompt;
  }

  private atomToMetta(atomese: string): TranslationResponse {
    try {
      const atom = AtomeseParser.parse(atomese);

      // Simple conversion logic
      let metta = this.convertAtomNodeToMetta(atom);

      return {
        output: metta,
        sourceFormat: Format.ATOMESE,
        targetFormat: Format.METTA,
        confidence: 0.9,
      };
    } catch (error) {
      throw new Error(
        `Failed to convert Atomese to MeTTa: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private convertAtomNodeToMetta(atom: any): string {
    // Basic conversion - can be enhanced
    switch (atom.type) {
      case "InheritanceLink":
        if (atom.children && atom.children.length === 2) {
          const child1 = atom.children[0].name || "?";
          const child2 = atom.children[1].name || "?";
          return `(: ${child1} ${child2})`;
        }
        break;
      case "EvaluationLink":
        if (atom.children && atom.children.length >= 2) {
          const pred = atom.children[0].name || "predicate";
          const args = atom.children
            .slice(1)
            .map((c: any) => c.name || "?")
            .join(" ");
          return `(${pred} ${args})`;
        }
        break;
    }
    return `(${atom.type} ${atom.name || ""})`;
  }

  private mettaToAtom(metta: string): TranslationResponse {
    try {
      const expr = MeTTaParser.parse(metta);

      // Simple conversion logic
      let atomese = this.convertMettaToAtomese(expr);

      return {
        output: atomese,
        sourceFormat: Format.METTA,
        targetFormat: Format.ATOMESE,
        confidence: 0.9,
      };
    } catch (error) {
      throw new Error(
        `Failed to convert MeTTa to Atomese: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private convertMettaToAtomese(expr: any): string {
    // Basic conversion - can be enhanced
    if (expr.type === "expression" && Array.isArray(expr.value)) {
      const first = expr.value[0];
      if (first && first.value === ":") {
        // Type declaration -> InheritanceLink
        const name = expr.value[1]?.value || "?";
        const type = expr.value[2]?.value || "?";
        return `(InheritanceLink (ConceptNode "${name}") (ConceptNode "${type}"))`;
      }
    }
    return `(ConceptNode "${JSON.stringify(expr)}")`;
  }

  /**
   * Batch translation for multiple inputs
   */
  async translateBatch(
    requests: TranslationRequest[],
  ): Promise<TranslationResponse[]> {
    return Promise.all(requests.map((req) => this.translate(req)));
  }

  /**
   * Set LLM API for natural language translations
   */
  setLLMApi(api: any): void {
    this.llmApi = api;
  }
}

export const translator = new LanguageTranslator();
