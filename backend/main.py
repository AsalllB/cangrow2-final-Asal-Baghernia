from flask import Flask, jsonify, request, Blueprint
from flask_cors import CORS
import PyPDF2
import io
import json

from utils import *

app = Flask(__name__)
CORS(app)

api_v1 = Blueprint('api_v1', __name__, url_prefix='/api/v1')

# Routes
@api_v1.route('/health')
def health_api():
    data = "Hello World!"
    return jsonify({'data': data})

@api_v1.route('/predict', methods=['POST'])
def predict_api():
    resume_text = None
    
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename.endswith('.pdf'):
            resume_text = extract_text_from_pdf(file)
        elif file and file.filename.endswith('.txt'):
            resume_text = extract_text_from_txt(file)
        else:
            return jsonify({'error': 'Invalid file format. Please upload a PDF.'}), 400
    elif 'text' in request.json:
        resume_text = request.json['text']
    else:
        return jsonify({'error': 'No resume text or file provided.'}), 400
    
    if not resume_text:
        return jsonify({'error': 'Resume text is empty.'}), 400
    
    predicted_job_title = pred(resume_text)
    predicted_job_title_proba = pred_proba(resume_text)

    return jsonify({
        'job_title': predicted_job_title,
        'job_title_proba': predicted_job_title_proba
    })

@api_v1.route('/job/analysis')
def job_analysis_api():
    predicts = request.args.get('predicts')
    
    if not predicts:
        return jsonify({'error': 'No job titles provided.'}), 400
    
    predicts = predicts.split(',')
    charts_data = generate_charts(predicts)
    
    return jsonify(charts_data)

@api_v1.route('/job/description', methods = ['POST'])
def job_description_api():
    job_title = request.json.get('job_title')
    
    if not job_title:
        return jsonify({'error': 'No job title provided.'}), 400
    
    prompt = f"""
    You are an expert HR content creator. Your task is to generate a concise job description and a list of the top 5 most relevant technical skills for a given job title and its associated roles.

    The job title is: **{job_title}**

    The output must be a JSON object with the following structure:
    {{
    "description": "A brief job description, maximum 8 lines long.",
    "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
    }}

    Do not include any introductory text or explanations outside of the JSON object.
    """
    
    job_description = nlp_prompt(prompt)
    
    if not job_description:
        return jsonify({'error': 'Failed to generate job description.'}), 500
    
    job_description = job_description.replace('```json', '').replace('```', '').strip()
    
    return jsonify({
        'job_title': job_title,
        'data': json.loads(job_description)
    })

@api_v1.route('/job/roadmap', methods = ['POST'])
def job_roadmap_api():
    job_title = request.json.get('job_title')
    
    if not job_title:
        return jsonify({'error': 'No job title provided.'}), 400
    
    prompt = f"""
    You are an expert curriculum designer and career mentor. Your task is to generate a structured, step-by-step learning roadmap for a given goal.

    The learning goal is: **{job_title}**

    The output must be a single JSON object. Do not include any Markdown, introductory text, or explanations outside of the JSON structure. The content within the JSON values should be plain text.

    The JSON object must follow this exact structure:
    {{
    "roadmap_title": "Roadmap for {job_title}",
    "phases": [
        {{
        "phase_number": 1,
        "phase_title": "Title of the first phase",
        "steps": [
            {{
            "step_number": 1,
            "step_title": "Title of the first step",
            "description": "A brief, one or two-sentence description of this step."
            }},
            {{
            "step_number": 2,
            "step_title": "Title of the second step",
            "description": "A brief, one or two-sentence description of this step."
            }}
        ]
        }},
        {{
        "phase_number": 2,
        "phase_title": "Title of the second phase",
        "steps": [
            {{
            "step_number": 1,
            "step_title": "Title of the first step in this phase",
            "description": "A brief, one or two-sentence description of this step."
            }}
        ]
        }}
    ]
    }}
    """
    
    job_roadmap = nlp_prompt(prompt)
    
    if not job_roadmap:
        return jsonify({'error': 'Failed to generate job roadmap.'}), 500
    
    job_roadmap = job_roadmap.replace('```json', '').replace('```', '').strip()
    
    return jsonify({
        'job_title': job_title,
        'data': json.loads(job_roadmap)
    })

@api_v1.route('/nlp/chat', methods = ['POST'])
def nlp_chat_api():
    user_message = request.json.get('message')
    
    if not user_message:
        return jsonify({'error': 'No message provided.'}), 400
    
    prompt = f"""
    You are a helpful assistant. Your task is to respond to the user's message in a concise and informative manner.
    Your name is JobGPT, and you are designed to assist users with job-related queries.
    Don't include any information about yourself or the system you are running on and If user asked just tell: "I'm JobGPT, a job-related assistant. I can help you with job titles, descriptions, and career advice."

    User's message: "{user_message}"
    
    The output must be a single JSON object. Do not include any Markdown, introductory text, or explanations outside of the JSON structure. The content within the JSON values should be plain text.
    
    The JSON object must follow this exact structure:
    {{
        "response": "Your response to the user's message."
    }}

    Please provide a response that is clear and directly addresses the user's query.
    """
    
    response = nlp_prompt(prompt)
    
    if not response:
        return jsonify({'error': 'Failed to generate response.'}), 500
    
    response = response.replace('```json', '').replace('```', '').strip()
    
    return jsonify(json.loads(response))

app.register_blueprint(api_v1)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)