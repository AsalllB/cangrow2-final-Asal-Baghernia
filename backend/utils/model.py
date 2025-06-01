import re
import pickle
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import PyPDF2
import requests
from google import genai

# API KEY
GEMINI_API_KEY = "AIzaSyA24F3V6hNvpdzJMo1yEtr-K22hl52Tb5w"

# File paths
DATA_PATH = './data/Job-Description-Dataset.csv'
MODEL_PATH = './model/model.pkl'
TFIDF_PATH = './model/tfidf.pkl'
ENCODER_PATH = './model/encoder.pkl'

# Load resources
df = pd.read_csv(DATA_PATH)
tfidf = pickle.load(open(TFIDF_PATH, 'rb'))
model = pickle.load(open(MODEL_PATH, 'rb'))
label_encoder = pickle.load(open(ENCODER_PATH, 'rb'))

transformer_model = SentenceTransformer('all-MiniLM-L6-v2')

client = genai.Client(api_key=GEMINI_API_KEY)

# Helper functions


def get_similar_titles(input_titles: list[str]) -> list[str]:
    """
    Given a list of job titles, find the most similar job title
    from a reference dataset.
    Args:
        input_titles (list[str]): List of job titles to find similar ones for.
    Returns:
        list[str]: List of most similar job titles from the reference dataset.
    """
    reference_titles = df['Job Title'].dropna().unique().tolist()

    ref_emb = transformer_model.encode(
        reference_titles, convert_to_numpy=True, normalize_embeddings=True)
    inp_emb = transformer_model.encode(
        input_titles, convert_to_numpy=True, normalize_embeddings=True)

    # Find the most similar title for each input title
    # using cosine similarity
    # and return the corresponding reference title
    # for each input title
    mapped_titles = []
    for vec in inp_emb:
        sims = cosine_similarity([vec], ref_emb)[0]
        best_idx = np.argmax(sims)
        mapped_titles.append(reference_titles[best_idx])

    return mapped_titles


def extract_text_from_txt(file):
    # Try using utf-8 encoding for reading the text file
    try:
        text = file.read().decode("utf-8")
    except UnicodeDecodeError:
        # In case utf-8 fails, try 'latin-1' encoding as a fallback
        text = file.read().decode("latin-1")
    return text


def extract_text_from_pdf(file):
    pdf_reader = PyPDF2.PdfReader(file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text


def nlp_prompt(prompt: str) -> str:
    """
    Send a prompt to the Gemini API and get the response.
    Args:
        prompt (str): The prompt to send to the API.
    Returns:
        str: The response from the API.
    """
    

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )

    return response.text


def cleanResume(text: str) -> str:
    cleanText = re.sub(r'http\S+\s', ' ', text)
    cleanText = re.sub(r'RT|cc', ' ', cleanText)
    cleanText = re.sub(r'#\S+\s', ' ', cleanText)
    cleanText = re.sub(r'@\S+', '  ', cleanText)
    cleanText = re.sub('[%s]' % re.escape(
        r"""!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~"""), ' ', cleanText)
    cleanText = re.sub(r'[^\x00-\x7f]', ' ', cleanText)
    cleanText = re.sub(r'\s+', ' ', cleanText)
    return cleanText


def pred(input_resume):
    cleaned_text = cleanResume(input_resume)

    # Vectorize the cleaned text using the same TF-IDF vectorizer used during training
    vectorized_text = tfidf.transform([cleaned_text])

    # Convert sparse matrix to dense
    vectorized_text = vectorized_text.toarray()

    # Prediction
    predicted_job_title = model.predict(vectorized_text)

    predicted_job_title_name = label_encoder.inverse_transform(
        predicted_job_title)

    return predicted_job_title_name[0]  # Return the job_title name


def pred_proba(input_resume):
    cleaned_text = cleanResume(input_resume)

    vectorized_text = tfidf.transform([cleaned_text]).toarray()

    probabilities = model.predict_proba(vectorized_text)[0]

    top3_index = np.argsort(probabilities)[::-1][:3]  # Descending order

    top3_labels = model.classes_[top3_index]
    top3_probs = probabilities[top3_index]

    top3_jobtitle = label_encoder.inverse_transform(top3_labels)

    results = []
    for category, prob in zip(top3_jobtitle, top3_probs):
        results.append({
            'job_title': category,
            'probability': float(prob),
            'percentage': f"{prob*100:.1f}%"
        })

    return results