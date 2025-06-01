from .model import get_similar_titles, df
import base64
import io
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use Agg backend for non-interactive plotting


# --- Helper Functions ---


def parse_salary(s):
    if not isinstance(s, str):
        return np.nan, np.nan
    parts = s.replace('$', '').replace('K', '000').split('-')
    if len(parts) == 2:
        return float(parts[0]), float(parts[1])
    return np.nan, np.nan


def parse_exp(s):
    if not isinstance(s, str):
        return np.nan, np.nan
    nums = [int(x) for x in s.split() if x.isdigit()]
    if len(nums) > 1:
        return nums[0], nums[1]
    elif len(nums) == 1:
        return nums[0], nums[0]
    return np.nan, np.nan


# --- Matplotlib Styling Configuration ---
CHART_BG_COLOR = '#202a48'  # oklch(27.8% 0.033 256.848)
TEXT_COLOR = 'white'
GRID_COLOR = '#6c757d'  # A lighter gray for grid lines on dark background
BAR_COLOR_PRIMARY = '#007bff'  # A nice blue for bars
BAR_COLOR_SECONDARY = '#28a745'  # A green for variety
PIE_COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545',
              '#17a2b8', '#6610f2']  # Brighter colors for pie charts
BOXPLOT_COLOR = '#fd7e14'  # Orange for boxplots


def style_dark_ax(ax, title, xlabel=None, ylabel=None, is_pie=False):
    """Helper function to style Matplotlib axes for dark background."""
    ax.set_facecolor(CHART_BG_COLOR)
    ax.set_title(title, color=TEXT_COLOR, fontsize=15, pad=15)

    if xlabel:
        ax.set_xlabel(xlabel, color=TEXT_COLOR, fontsize=12)
    if ylabel:
        ax.set_ylabel(ylabel, color=TEXT_COLOR, fontsize=12)

    if not is_pie:  # Pie charts don't have typical spines/ticks in the same way
        ax.tick_params(axis='x', colors=TEXT_COLOR, labelsize=10)
        ax.tick_params(axis='y', colors=TEXT_COLOR, labelsize=10)
        for spine in ax.spines.values():
            spine.set_edgecolor(TEXT_COLOR)
        ax.grid(True, color=GRID_COLOR, linestyle='--',
                linewidth=0.5, alpha=0.7)
    else:  # Remove ticks and spines for pie charts
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)


def fig_to_base64(fig):
    """Converts a Matplotlib figure to a base64 encoded PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight',
                facecolor=fig.get_facecolor(), dpi=100)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)  # Close the figure to free up memory
    return img_base64


def generate_charts(predicts: list[str]) -> dict:
    """
    Generate charts based on predictions, salaries, and experience.

    Args:
        predicts (list[str]): List of predicted job titles.
        salaries (list[str]): List of salary ranges.
        exp (list[str]): List of experience requirements.

    Returns:
        dict: Dictionary containing chart data.
    """
    # Map titles to the reference dataset
    mapped_titles = get_similar_titles(predicts)

    edf = df[df['Job Title'].isin(mapped_titles)].copy()
    edf[['Salary_Min', 'Salary_Max']] = pd.DataFrame(
        edf['Salary Range'].map(parse_salary).tolist(), index=edf.index)
    edf[['Exp_Min', 'Exp_Max']] = pd.DataFrame(
        edf['Experience'].map(parse_exp).tolist(), index=edf.index)
    edf.dropna(subset=['Salary_Min', 'Salary_Max',
               'Exp_Min', 'Exp_Max'], inplace=True)

    # --- Chart Data Generation ---
    charts_data = {}

    # --- 1. Salary Range Distribution (Box Plot) ---
    chart_name = 'salary_distribution'
    charts_data[chart_name] = {
        'image_base64': None,
    }
    fig, ax = plt.subplots(figsize=(7, 5))
    fig.patch.set_facecolor(CHART_BG_COLOR)
    boxplot_props = dict(patch_artist=True, medianprops={'color': 'yellow', 'linewidth': 1.5},
                         boxprops={'facecolor': BOXPLOT_COLOR,
                                   'edgecolor': TEXT_COLOR, 'linewidth': 1},
                         whiskerprops={'color': TEXT_COLOR, 'linewidth': 1},
                         capprops={'color': TEXT_COLOR, 'linewidth': 1})
    ax.boxplot([edf['Salary_Min'].dropna(), edf['Salary_Max'].dropna()], labels=[
               'Min Salary', 'Max Salary'], **boxplot_props)
    style_dark_ax(ax, 'Salary Range Distribution', ylabel='Salary (USD)')
    charts_data[chart_name]['image_base64'] = fig_to_base64(fig)

    # --- 2. Salary by Work Type (Box Plot) ---
    chart_name = 'salary_by_work_type'
    charts_data[chart_name] = {
        'image_base64': None,
    }
    work_types = edf['Work Type'].unique().tolist()
    salary_by_type_data = [edf.loc[edf['Work Type'] == t,
                                   'Salary_Min'].dropna().tolist() for t in work_types]
    if work_types and any(salary_by_type_data):
        fig, ax = plt.subplots(figsize=(8, 6))
        fig.patch.set_facecolor(CHART_BG_COLOR)
        ax.boxplot(salary_by_type_data, labels=work_types, **boxplot_props)
        style_dark_ax(ax, 'Salary by Work Type',
                      ylabel='Minimum Salary (USD)', xlabel='Work Type')
        plt.xticks(rotation=30, ha='right')
        charts_data[chart_name]['image_base64'] = fig_to_base64(fig)
    else:
        charts_data[chart_name]['image_base64'] = None

    # --- 3. Top 10 Countries by Average Min Salary (Bar Chart) ---
    chart_name = 'top_countries_salary'
    charts_data[chart_name] = {
        'image_base64': None,
    }
    mean_salary_country = edf.groupby(
        'Country')['Salary_Min'].mean().sort_values(ascending=False).head(10)
    if not mean_salary_country.empty:
        fig, ax = plt.subplots(figsize=(10, 6))
        fig.patch.set_facecolor(CHART_BG_COLOR)
        bars = ax.bar(mean_salary_country.index,
                      mean_salary_country.values, color=BAR_COLOR_PRIMARY)
        style_dark_ax(ax, 'Top 10 Countries by Avg Min Salary',
                      ylabel='Avg Min Salary (USD)', xlabel='Country')
        ax.bar_label(bars, fmt='%.0f', color=TEXT_COLOR, padding=3)
        plt.xticks(rotation=45, ha='right')
        charts_data[chart_name]['image_base64'] = fig_to_base64(fig)
    else:
        charts_data[chart_name]['image_base64'] = None

    # --- 4. Top 10 Roles by Posting Count (Horizontal Bar Chart) ---
    chart_name = 'top_roles_count'
    charts_data[chart_name] = {
        'image_base64': None,
    }
    role_counts = edf['Role'].value_counts().head(10)
    if not role_counts.empty:
        fig, ax = plt.subplots(figsize=(10, 7))
        fig.patch.set_facecolor(CHART_BG_COLOR)
        bars = ax.barh(
            role_counts.index[::-1], role_counts.values[::-1], color=BAR_COLOR_SECONDARY)
        style_dark_ax(ax, 'Top 10 Roles by Posting Count',
                      xlabel='Number of Postings', ylabel='Role')
        ax.bar_label(bars, fmt='%d', color=TEXT_COLOR, padding=3)
        charts_data[chart_name]['image_base64'] = fig_to_base64(fig)
    else:
        charts_data[chart_name]['image_base64'] = None

    # --- 5. Posting Count by Minimum Experience (Bar Chart) ---
    chart_name = 'experience_posting_count'
    charts_data[chart_name] = {
        'image_base64': None,
    }
    exp_counts = edf['Exp_Min'].value_counts().sort_index()
    if not exp_counts.empty:
        fig, ax = plt.subplots(figsize=(8, 5))
        fig.patch.set_facecolor(CHART_BG_COLOR)
        bars = ax.bar(exp_counts.index.astype(str),
                      exp_counts.values, color=BAR_COLOR_PRIMARY)
        style_dark_ax(ax, 'Postings by Min Experience',
                      ylabel='Number of Postings', xlabel='Years of Experience')
        ax.bar_label(bars, fmt='%d', color=TEXT_COLOR, padding=3)
        charts_data[chart_name]['image_base64'] = fig_to_base64(fig)
    else:
        charts_data[chart_name]['image_base64'] = None

    # --- 6. Distribution of Work Types (Pie Chart) ---
    chart_name = 'work_type_distribution'
    charts_data[chart_name] = {
        'image_base64': None,
    }
    work_type_counts = edf['Work Type'].value_counts()
    if not work_type_counts.empty:
        fig, ax = plt.subplots(figsize=(7, 7))
        fig.patch.set_facecolor(CHART_BG_COLOR)
        wedges, texts, autotexts = ax.pie(work_type_counts.values, labels=work_type_counts.index,
                                          autopct='%1.1f%%', startangle=140,
                                          colors=PIE_COLORS[:len(
                                              work_type_counts)],
                                          pctdistance=0.85,
                                          textprops={'color': TEXT_COLOR, 'fontsize': 10, 'weight': 'bold'})
        for autotext in autotexts:  # Style percentage text
            # Black for visibility on bright pie slices, or choose dynamic
            autotext.set_color('black')
            autotext.set_fontsize(9)
            autotext.set_fontweight('bold')

        # Equal aspect ratio ensures that pie is drawn as a circle.
        ax.axis('equal')
        style_dark_ax(ax, 'Distribution of Work Types', is_pie=True)
        # Add a legend if many slices or labels overlap
        ax.legend(wedges, work_type_counts.index, title="Work Types", loc="center left", bbox_to_anchor=(1, 0, 0.5, 1),
                  labelcolor=TEXT_COLOR, facecolor=CHART_BG_COLOR, edgecolor=TEXT_COLOR)

        charts_data[chart_name]['image_base64'] = fig_to_base64(fig)
    else:
        charts_data[chart_name]['image_base64'] = None

    # --- 7. Min Salary by Company Size Group (Box Plot) ---
    chart_name = 'salary_by_company_size'
    charts_data[chart_name] = {
        'image_base64': None,
    }
    # Use float('inf') for the last bin
    bins = [0, 50000, 100000, 200000, 500000, float('inf')]
    labels = ['<50k', '50k-100k', '100k-200k', '200k-500k', '>500k']
    edf['CompanyBin'] = pd.cut(
        edf['Company Size'], bins=bins, labels=labels, right=False)
    salary_by_company_size_data = [
        edf.loc[edf['CompanyBin'] == lab, 'Salary_Min'].dropna().tolist() for lab in labels]
    if any(salary_by_company_size_data):
        fig, ax = plt.subplots(figsize=(9, 6))
        fig.patch.set_facecolor(CHART_BG_COLOR)
        ax.boxplot(salary_by_company_size_data, labels=labels, **boxplot_props)
        style_dark_ax(ax, 'Min Salary by Company Size Group',
                      ylabel='Min Salary (USD)', xlabel='Company Size')
        charts_data[chart_name]['image_base64'] = fig_to_base64(fig)
    else:
        charts_data[chart_name]['image_base64'] = None

    # --- Summary Statistics ---
    summary = {
        'Total_Postings': int(edf.shape[0]),
        'Avg_Salary_Min': round(edf['Salary_Min'].mean(), 2),
        'Median_Experience': int(edf['Exp_Min'].median()),
        'Diverse_Countries': int(edf['Country'].nunique()),
        'Flexible_Work_Types': edf['Work Type'].unique().tolist(),
        'Company_Size_Range': f"{int(edf['Company Size'].min())} - {int(edf['Company Size'].max())}"
    }

    # --- Combine all data and return as JSON ---
    response_data = {
        "summary": summary,
        "charts": charts_data
    }

    return response_data
